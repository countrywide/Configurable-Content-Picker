<%@ Page Language="C#" AutoEventWireup="true" %>
<%@ Import Namespace="Umbraco.Core" %>
<%@ Import Namespace="Umbraco.Core.Logging" %>
<%@ Import Namespace="Umbraco.Core.Models" %>
<%@ Import Namespace="System.Web.Script.Serialization" %>
<%@ Import Namespace="Umbraco.Web" %>
<%@ Import Namespace="System.Reflection" %>

<script language="c#" runat="server">
 
    public void Page_Load(object sender, EventArgs e)
    {
        var response = string.Empty;
        var currentUser = UmbracoContext.Current.Security.CurrentUser;
        if (currentUser != null)
        {
            var method = Request.QueryString["Action"];
            if (method != null)
            {
                switch (method.ToLower())
                {
                    case "getdoctypes":
                        response = new JavaScriptSerializer().Serialize(GetAllDocTypes());
                        break;
                    case "getcontent":
                        var startContentId = currentUser.StartContentId;
                        response = new JavaScriptSerializer().Serialize(GetContentOfDocType(startContentId));
                        break;
                }
            }
        }
        HttpContext.Current.Response.Write(response);
    }

    private static GetDocTypesResponse GetAllDocTypes()
    {
        var response = new GetDocTypesResponse();
        
        try
        {
            var contentTypeService = ApplicationContext.Current.Services.ContentTypeService;
            var doctypes = contentTypeService.GetAllContentTypes().Select(a => new DocumentTypeDTO
            {
                Name = a.Name,
                Id = a.Id.ToString()
            });
            response.DocumentTypes = doctypes.OrderBy(d => d.Name).ToList();
        }
        catch (Exception ex)
        {
            HandleException(ex, response, "Get Document Types", MethodBase.GetCurrentMethod().DeclaringType);
            
        }
        return response;
    }

    private GetContentResponse GetContentOfDocType(int startContentId)
    {
        var response = new GetContentResponse();
        
        try
        {
            var contentOfDocumentTypes = new List<ContentDTO>();
            var contentService = ApplicationContext.Current.Services.ContentService;
            
            //get the Document Types that the Content needs to implement
            var allDocTypes = GetAllSelectedDocTypes();

            //get the list of selected content so it can be flagged as selected.
            var allSelectedContentIds = GetAllSelectedContentIds();
            
            if (allDocTypes.Any())
            {
                //get the content that is of the specified document types.
                foreach (var currentDocType in allDocTypes)
                {
                    var contentList = contentService.GetContentOfContentType(currentDocType).Where(n => n.Status != ContentStatus.Trashed && n.Status != ContentStatus.Expired).ToList();

                    if (contentList.Any())
                    {
                        List<IContent> allContent;
                        //if the current users start Content Id is not -1 then filter the content down to those that have the users starting content id in their Path.
                        if (startContentId > -1)
                        {
                            var pattern = string.Format(",\\s?{0},|{0}$", startContentId);
                            var regex = new Regex(pattern);
                            allContent = contentList.Where(n => regex.IsMatch(n.Path)).ToList();
                        }
                        else
                        {
                            allContent = contentList.ToList();
                        }
                        allContent.ForEach(n => ProcessContent(n, contentOfDocumentTypes, currentDocType, allSelectedContentIds, startContentId));
                    }
                }
                //re order the processed content so that it is in the same order as it would appear in the Content Tree.
                contentOfDocumentTypes.ForEach(ReorderChildren);
                if (contentOfDocumentTypes.Any())
                {
                    response.Content = contentOfDocumentTypes.OrderBy(d => d.SortOrder).ToList();
                }
            }
            else
            {
                response.ErrorMessage = "No Document types have been set";
            }
        }
        catch (Exception ex)
        {
            HandleException(ex, response, "Get Content of Document Types", MethodBase.GetCurrentMethod().DeclaringType);
        }
        return response;
    }

    private List<int> GetAllSelectedDocTypes()
    {
        var allDocTypes = new List<int>();
        var allDocTypeIds = Request.QueryString["DocTypeId"];
        if (allDocTypeIds != null)
        {
            int id;
            //get the allowed Document Types
            if (allDocTypeIds.IndexOf(",", StringComparison.Ordinal) > -1)
            {
                var docTypesSplit = allDocTypeIds.Split(',');
                foreach (var typeId in docTypesSplit)
                {
                    if (int.TryParse(typeId, out id))
                    {
                        allDocTypes.Add(id);
                    }
                }
            }
            else
            {
                if (int.TryParse(allDocTypeIds, out id))
                {
                    allDocTypes.Add(id);
                }
            }
        }
        return allDocTypes;
    }

    private List<int> GetAllSelectedContentIds()
    {
        var allSelectedContentIds = new List<int>();
        var selectedContentIds = Request.QueryString["SelectedContentId"];
        if (selectedContentIds != null)
        {
            if (selectedContentIds.Length > 0)
            {
                int selectedContentId;
                if (selectedContentIds.IndexOf(",", StringComparison.Ordinal) > -1)
                {
                    var contentIds = selectedContentIds.Split(',');
                    foreach (var contentId in contentIds)
                    {
                        //get the value of the selected content if set.
                        if (int.TryParse(contentId, out selectedContentId))
                        {
                            allSelectedContentIds.Add(selectedContentId);
                        }
                    }
                }
                else
                {
                    if (int.TryParse(selectedContentIds, out selectedContentId))
                    {
                        allSelectedContentIds.Add(selectedContentId);
                    }
                }
            }
        }
        return allSelectedContentIds;
    }


    private static void ProcessContent(IContent currentContent, List<ContentDTO> docTypesContent, int docTypeId, List<int> allSelectedContentIds, int startContentId)
    {
        var parentContentId = currentContent.ParentId;
        ContentDTO topContentDTO = null;
        var contentDTO = CreateContentDTO(currentContent, docTypeId, allSelectedContentIds);
        
        //get the content that make up the tree for the current content
        if (parentContentId != startContentId)
        {
            var parentContent = currentContent.Parent();
            ContentDTO parentContentDTO = null;
            var childDTO = contentDTO;
            while (parentContent != null && parentContent.Id >= startContentId)
            {
                parentContentDTO = CreateContentDTO(parentContent, docTypeId, allSelectedContentIds);
                parentContentDTO.Children.Add(childDTO);
                if (!parentContentDTO.IsSelected)
                {
                    parentContentDTO.IsExpanded = childDTO.IsExpanded;
                }

                childDTO = parentContentDTO;
                parentContent = parentContent.Parent();
            }
            if (parentContentDTO != null)
            {
                topContentDTO = parentContentDTO;
            }
        }
        else
        {
            topContentDTO = contentDTO;
        }
        if (topContentDTO != null)
        {
            //add the current content and its tree to the docTypeContent collection
            AddContentToList(topContentDTO, docTypesContent);
        }
    }

    private static ContentDTO CreateContentDTO(IContent currentContent, int docTypeId, List<int> allSelectedContentIds)
    {
        var newContentDTO = new ContentDTO
        {
            Id = currentContent.Id,
            Name = currentContent.Name,
            Status = currentContent.Status.ToString(),
            Icon = currentContent.ContentType.Icon,
            SortOrder = currentContent.SortOrder,
            DocTypeAlias = currentContent.ContentType.Alias,
            DocTypeId = currentContent.ContentTypeId.ToString(),
            IsSelected = allSelectedContentIds.Contains(currentContent.Id),
            IsExpanded = allSelectedContentIds.Contains(currentContent.Id),
            IsSelectable = currentContent.ContentTypeId == docTypeId
        };
        return newContentDTO;
    }

    private static void AddContentToList(ContentDTO currentContentDTO, List<ContentDTO> contentList)
    {
        var existingContent = contentList.FirstOrDefault(d => d.Id == currentContentDTO.Id);
        if (existingContent == null)
        {
            existingContent = currentContentDTO;
            contentList.Add(currentContentDTO);
        }
        else
        {
            if (!existingContent.IsExpanded)
            {
                existingContent.IsExpanded = currentContentDTO.IsExpanded;
            }
        }
        currentContentDTO.Children.ForEach(c => AddContentToList(c, existingContent.Children));
    }

    private static void ReorderChildren(ContentDTO content)
    {
        if (content.Children.Any())
        {
            content.Children = content.Children.OrderBy(c => c.SortOrder).ToList();
            content.Children.ForEach(ReorderChildren);
        }
    }

    private static void HandleException(Exception ex, BaseResponse response, string method, Type type)
    {
        response.ErrorMessage = string.Format("An error has occurred in the {0} method", method);
        response.Exception = string.Format("Exception: {0}", ex);
        LogHelper.Error(type, method, ex);
    }

    private class BaseResponse
    {
        public string ErrorMessage { get; set; }

        public string Exception { get; set; }

        public BaseResponse()
        {
            ErrorMessage = string.Empty;
            Exception = string.Empty;
        }
    }

    private class GetContentResponse : BaseResponse
    {
        public List<ContentDTO> Content { get; set; }
        
        public GetContentResponse()
        {
            Content = new List<ContentDTO>();
        }
    }

    private class GetDocTypesResponse : BaseResponse
    {
        public List<DocumentTypeDTO> DocumentTypes { get; set; }

        public GetDocTypesResponse()
        {
            DocumentTypes = new List<DocumentTypeDTO>();
        }
    }

    private class ContentDTO
    {
        public int Id { get; set; }

        public string Name { get; set; }

        public string Status { get; set; }

        public string Icon { get; set; }

        public int SortOrder { get; set; }

        public bool IsSelected { get; set; }

        public bool IsExpanded { get; set; }

        public bool IsSelectable { get; set; }

        public string DocTypeAlias { get; set; }

        public string DocTypeId { get; set; }

        public List<ContentDTO> Children { get; set; }

        public ContentDTO()
        {
            Children = new List<ContentDTO>();
        }
    }

    private class DocumentTypeDTO
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public bool IsSelected { get; set; }
    }

</script>