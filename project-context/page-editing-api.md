# Page Editing API Documentation

## Overview

The Page Editing API provides complete CRUD operations for managing pages within a site. Pages support:

- Title, slug (URL), and custom paths
- Published/draft states
- Home page designation
- SEO metadata (title, description, keywords, OG image)
- Section management (pages can contain multiple sections)

## API Endpoints

### Create Page

**POST** `/sites/:siteId/pages`

Creates a new page within a site.

**Request Body:**

```typescript
{
  title: string                    // Required. Max 150 characters
  slug?: string                    // Optional. Lowercase, numbers, hyphens only. Max 120 chars
  path?: string                    // Optional. Custom path like /about-us or /blog/post
  pageType?: string                // Optional. One of: LANDING, NORMAL, BLOG, NEWS, PRODUCT, CHECKOUT, CUSTOM
  isPublished?: boolean            // Optional. Draft (false) or published (true). Default: false
  isHomePage?: boolean             // Optional. Set as site's home page. Default: false
  sortOrder?: number               // Optional. Display order among pages
  seoTitle?: string                // Optional. SEO title tag. Max 160 chars
  seoDescription?: string          // Optional. Meta description. Max 320 chars
  seoKeywords?: string             // Optional. Keywords for SEO. Max 320 chars
  ogImageUrl?: string              // Optional. OG image for social sharing. Max 500 chars
}
```

**Response:**

```typescript
{
  success: true,
  data: {
    id: string
    title: string
    slug: string
    path: string
    pageType: string
    isPublished: boolean
    isHomePage: boolean
    createdAt: string
    updatedAt: string
    // ... other fields
  }
}
```

**Key Behaviors:**

- If `slug` is not provided, it's auto-generated from the title
- If `path` is not provided, it's auto-generated from the slug (e.g., slug "about-us" → path "/about-us")
- If `isHomePage` is true, all other pages' home page designation is removed
- The first page created is automatically set as home page
- Plan limit: `maxPagesPerSite` from subscription tier (checked against workspace's current plan)

**Error Codes:**

- `PAGE_TITLE_REQUIRED` - No title provided
- `PAGE_SLUG_REQUIRED` - Slug could not be generated (typically invalid characters only)
- `PAGE_SLUG_ALREADY_EXISTS` - Slug is already used by another page on this site
- `PAGE_PATH_ALREADY_EXISTS` - Custom path is already used by another page on this site
- `PAGE_LIMIT_REACHED` - Workspace has reached max pages for current subscription tier
- `HOME_PAGE_PATH_RESERVED` - Path "/" is reserved for home page
- `SITE_NOT_FOUND_OR_FORBIDDEN` - No access to this site

---

### List Pages

**GET** `/sites/:siteId/pages`

Retrieves all pages for a site, ordered by home page first, then by sort order.

**Response:**

```typescript
{
  success: true,
  data: [
    {
      id: string
      siteId: string
      title: string
      slug: string
      path: string
      pageType: string
      isPublished: boolean
      isHomePage: boolean
      sortOrder: number
      _count: {
        sections: number
        forms: number
      }
      createdAt: string
      updatedAt: string
    }
    // ... more pages
  ]
}
```

---

### Get Single Page

**GET** `/sites/:siteId/pages/:pageId`

Retrieves a single page with all its sections and forms.

**Response:**

```typescript
{
  success: true,
  data: {
    id: string
    title: string
    slug: string
    path: string
    pageType: string
    isPublished: boolean
    isHomePage: boolean
    sections: Array<Section>       // Ordered by sortOrder
    forms: Array<Form>             // Ordered by creation date
    _count: {
      sections: number
      forms: number
    }
    // ... other fields
  }
}
```

---

### Update Page

**PATCH** `/sites/:siteId/pages/:pageId`

Updates page properties. All fields are optional.

**Request Body:** (Same as CreatePageDto, all fields optional)

**Key Behaviors:**

- Changing `isHomePage` from true to false requires another page to be home page first
- Updating `slug` triggers uniqueness check (excluding current page)
- Updating `path` triggers uniqueness check (excluding current page)
- Setting `isHomePage` to true removes this designation from all other pages

**Error Codes:**

- Same as create, plus:
- `HOME_PAGE_REQUIRED` - Cannot unset home page when it's the only home page
- `PAGE_NOT_FOUND` - Page doesn't exist or no access

---

### Delete Page

**DELETE** `/sites/:siteId/pages/:pageId`

Deletes a page permanently.

**Restrictions:**

- Cannot delete a page marked as home page (must reassign home page first)
- All sections and forms attached to the page are also deleted

**Response:**

```typescript
{
  success: true,
  data: {
    id: string
    deleted: true
  }
}
```

**Error Codes:**

- `PAGE_NOT_FOUND` - Page doesn't exist
- `HOME_PAGE_DELETE_NOT_ALLOWED` - Cannot delete the home page
- `SITE_NOT_FOUND_OR_FORBIDDEN` - No access to site

---

## Slug & Path Rules

### Slug Rules

- **Allowed characters:** lowercase letters (a-z), numbers (0-9), hyphens (-)
- **Max length:** 120 characters
- **Pattern:** Must match `/^[a-z0-9-]+$/`
- **Uniqueness:** scoped to site (two different sites can have pages with same slug)
- **Auto-generation:** From title, converting:
  - Spaces → hyphens
  - Uppercase → lowercase
  - Special characters → removed
  - Consecutive hyphens → single hyphen

Example: "My Blog Post!" → "my-blog-post"

### Path Rules

- **Default:** Auto-generated from slug: `"/my-blog-post"`
- **Custom:** Can be any valid URL path like `/about/team` or `/blog/2024/post`
- **Home page:** Always `/` (cannot be customized)
- **Uniqueness:** Scoped to site
- **No trailing slash:** Paths are normalized (trailing slashes removed)

---

## State Transitions

### Publishing Workflow

```
CREATE PAGE
  ↓
isPublished=false (Draft)
  ↓
PATCH isPublished=true
  ↓
isPublished=true (Published)
  ↓
PATCH isPublished=false
  ↓
isPublished=false (Draft again)
```

### Home Page Transitions

```
CREATE FIRST PAGE
  ↓
Automatically isHomePage=true
  ↓
CREATE SECOND PAGE
  ↓
isHomePage=false (first page remains home)
  ↓
PATCH second page with isHomePage=true
  ↓
First page.isHomePage → false
Second page.isHomePage → true
  ↗
Cannot unset if it's the only home page
```

---

## Error Handling for Non-Technical Users

### Common Errors & How to Fix

| Error Code                     | User Message                                     | How to Fix                                  |
| ------------------------------ | ------------------------------------------------ | ------------------------------------------- |
| `PAGE_TITLE_REQUIRED`          | "Page title is required"                         | Add a title for your page                   |
| `PAGE_SLUG_ALREADY_EXISTS`     | "A page with this URL already exists"            | Try a different URL slug                    |
| `PAGE_PATH_ALREADY_EXISTS`     | "This path is already in use"                    | Choose a different custom path              |
| `PAGE_LIMIT_REACHED`           | "You've reached the maximum pages for your plan" | Delete unused pages or upgrade plan         |
| `HOME_PAGE_REQUIRED`           | "You need a home page"                           | Assign another page as home first           |
| `HOME_PAGE_DELETE_NOT_ALLOWED` | "Cannot delete home page"                        | Make a different page home first            |
| `SITE_NOT_FOUND_OR_FORBIDDEN`  | "You don't have access to this site"             | Check your permissions with workspace admin |

---

## Frontend Integration Example

### Creating a Page

```typescript
const response = await fetch(`/sites/${siteId}/pages`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title: "About Us",
    // slug and path auto-generated
    pageType: "NORMAL",
    isPublished: false,
  }),
});

if (!response.ok) {
  const error = await response.json();
  // error.data contains error code: "PAGE_SLUG_ALREADY_EXISTS"
  // Use error code to show localized message to user
  showError(getPageErrorMessage(error.data));
}
```

### Handling Slug Conflicts

When a slug conflict occurs, frontend should:

1. Show error message: "Page URL already in use"
2. Suggest alternatives (e.g., adding numbers: "about-us-2")
3. Auto-trim the title if it's too long (150 char limit)

### Publishing Workflow

```typescript
// Draft page
const page = { isPublished: false };

// Publish when ready
await fetch(`/sites/${siteId}/pages/${pageId}`, {
  method: "PATCH",
  body: JSON.stringify({ isPublished: true }),
});

// Can unpublish later
await fetch(`/sites/${siteId}/pages/${pageId}`, {
  method: "PATCH",
  body: JSON.stringify({ isPublished: false }),
});
```

---

## Best Practices

1. **Auto-generate slugs:** Let users focus on titles, auto-generate slugs
2. **Validate field lengths:** Warn if title > 150, slug > 120, paths > 200 characters
3. **Provide path guidance:** Show examples of valid custom paths
4. **Confirm deletions:** Always ask for confirmation before deleting pages
5. **Show page count:** Display "X of Y pages" to warn of plan limits
6. **Handle Thai content:** For Thai titles, auto-slot will work but slugs need manual entry (special characters removed)
7. **SEO guidance:** Mark SEO fields as optional, show character counts as users type
8. **Home page clarity:** Show which page is home in listings, prevent accidental changes

---

## Database Schema

```prisma
model Page {
  id              String      @id @default(cuid())
  siteId          String
  title           String
  slug            String
  path            String
  pageType        PageType    @default(NORMAL)
  isHomePage      Boolean     @default(false)
  isPublished     Boolean     @default(false)
  sortOrder       Int         @default(0)

  seoTitle        String?
  seoDescription  String?
  seoKeywords     String?
  ogImageUrl      String?

  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  site            Site        @relation(fields: [siteId], references: [id], onDelete: Cascade)
  sections        Section[]
  forms           Form[]

  @@unique([siteId, slug])
  @@unique([siteId, path])
  @@index([siteId, sortOrder])
}
```

---

## Testing Checklist

- [x] DTO validation for all fields
- [x] Slug generation from titles with special characters
- [x] Slug uniqueness enforcement per site
- [x] Path uniqueness enforcement per site
- [x] Home page state management
- [x] Prevent deletion of only home page
- [x] Publish/unpublish state transitions
- [ ] Integration tests with real DB (setup needed)
- [ ] Frontend error message localization to Thai
- [ ] Mobile responsiveness of page editor UI
