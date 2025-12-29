# Letterboxd Integration Plan

**Date:** January 2025  
**Username:** Woogles  
**Status:** Planning Phase

---

## Overview

Integrate Letterboxd RSS feed to automatically sync movie ratings while preserving custom markdown content. This allows managing ratings in one place (Letterboxd) while keeping custom reviews, tags, and metadata in markdown files.

**Key Benefits:**
- Single source of truth for ratings (Letterboxd)
- Preserve custom content (reviews, tags, director) in markdown
- Automatic sync on build or manual trigger
- Seamless integration with existing workflow

---

## Architecture

```
Letterboxd RSS Feed
    ↓
Sync Script (fetches & parses)
    ↓
Match Movies (by letterboxdId or title+year)
    ↓
Update Ratings in Markdown Files
    ↓
Build Process (Astro renders with synced ratings)
    ↓
Website (displays synced ratings + custom content)
```

**Data Flow:**
1. Sync script fetches `https://letterboxd.com/woogles/rss/`
2. Parses XML to extract ratings
3. Matches movies to existing markdown files
4. Updates `rating` field while preserving all other content
5. Build process uses updated markdown files

---

## Implementation Steps

### 1. Update Content Schema

**File:** `src/content/config.ts`

- Add `letterboxdId` field (optional string) to movie schema
- This will be the slug from Letterboxd URLs (e.g., "the-matrix-1999")
- Allows reliable matching between Letterboxd and markdown files

**Example:**
```typescript
const movies = defineCollection({
  type: "content",
  schema: baseMediaSchema.extend({
    director: z.string().optional(),
    letterboxdId: z.string().optional(), // NEW FIELD
  }),
});
```

### 2. Create Letterboxd Sync Utility

**File:** `src/utils/letterboxd.ts` (new)

- Function to fetch RSS feed: `https://letterboxd.com/woogles/rss/`
- Parse XML/RSS to extract:
  - Movie title
  - Year
  - Rating (0-5 stars, convert to 0-10 scale)
  - Letterboxd URL/slug
  - Review date
- Return structured data array

**Key Functions:**
- `fetchLetterboxdRSS()` - Fetches and returns raw RSS XML
- `parseLetterboxdRSS(xml)` - Parses XML and extracts movie data
- `convertRating(stars)` - Converts 0-5 stars to 0-10 scale

### 3. Create Sync Script

**File:** `scripts/sync-letterboxd.ts` (new)

**Matching Strategy:**
1. Primary: Match by `letterboxdId` field (if present) - most reliable
2. Fallback: Match by title + year (fuzzy matching for edge cases)

**Update Process:**
- Read existing markdown files from `src/content/movies/`
- Parse frontmatter using gray-matter or Astro's utilities
- Match movies using strategy above
- Update `rating` field from Letterboxd
- Preserve all other fields (director, tags, custom review, etc.)
- Write back to file

**Edge Case Handling:**
- Movies in Letterboxd but not in site: Log for manual creation
- Movies in site but not in Letterboxd: Keep existing rating
- Rating conflicts: Letterboxd wins (as source of truth)
- Invalid frontmatter: Skip with warning

### 4. Add Build Script Integration

**File:** `package.json`

**New Scripts:**
```json
{
  "scripts": {
    "sync:letterboxd": "tsx scripts/sync-letterboxd.ts",
    "prebuild": "npm run sync:letterboxd"  // Optional: auto-sync
  }
}
```

**Dependencies to Install:**
- `tsx` - TypeScript execution for scripts
- `fast-xml-parser` or `xml2js` - RSS/XML parsing
- `gray-matter` - Frontmatter parsing (if needed)

### 5. Update Existing Movies

**File:** `src/content/movies/the-matrix.md`

Add `letterboxdId` field to existing movies:
```markdown
---
title: The Matrix
year: 1999
letterboxdId: the-matrix-1999  # NEW FIELD
rating: 10
...
---
```

**Options:**
- Manual: Add IDs to existing movies one by one
- Automated: Create helper script to match and suggest IDs

### 6. Documentation

**File:** `LETTERBOXD_SYNC.md` or add to `README.md`

Document:
- How to add `letterboxdId` to new movies
- How to run sync script
- Sync process explanation
- Note that custom content (reviews, tags) is preserved

---

## Files to Create/Modify

### New Files
- `src/utils/letterboxd.ts` - RSS fetching and parsing functions
- `scripts/sync-letterboxd.ts` - Main sync script
- `LETTERBOXD_SYNC.md` - Documentation (optional)

### Modified Files
- `src/content/config.ts` - Add `letterboxdId` field to schema
- `package.json` - Add sync script and dependencies
- `src/content/movies/*.md` - Add `letterboxdId` fields (manual or via script)

---

## Dependencies

```json
{
  "devDependencies": {
    "tsx": "^4.0.0",
    "fast-xml-parser": "^4.0.0",
    "gray-matter": "^4.0.0"
  }
}
```

---

## Edge Cases

1. **Movies with same title but different years**
   - Use year in matching logic
   - Prefer `letterboxdId` when available

2. **Movies not found in Letterboxd**
   - Keep existing rating in markdown
   - No error, just skip

3. **RSS feed errors**
   - Graceful fallback
   - Log error but don't break build
   - Use cached data if available

4. **Invalid/missing frontmatter**
   - Skip file with warning
   - Don't break sync process

5. **Rating conversion**
   - Letterboxd: 0-5 stars (or half stars)
   - Website: 0-10 scale
   - Conversion: `rating = stars * 2`

---

## Testing Strategy

1. **Test with existing movie (The Matrix)**
   - Add `letterboxdId: the-matrix-1999`
   - Run sync script
   - Verify rating updates from Letterboxd

2. **Verify rating sync works**
   - Check that rating in markdown matches Letterboxd
   - Test with different rating values

3. **Verify custom content preserved**
   - Ensure director, tags, custom review remain unchanged
   - Only `rating` field should update

4. **Test with movie not in Letterboxd**
   - Movie exists in site but not in Letterboxd
   - Should keep existing rating

5. **Test matching logic**
   - Test matching by `letterboxdId`
   - Test fallback matching by title+year
   - Test edge cases (special characters, different formats)

---

## Future Workflow

1. **Rate a movie on Letterboxd**
2. **Run sync script** (or auto-sync on build)
   ```bash
   npm run sync:letterboxd
   ```
3. **Rating appears on website automatically**
4. **Custom content (reviews, tags) remains in markdown**

---

## Implementation Todos

- [ ] Add `letterboxdId` field to movie schema in `src/content/config.ts`
- [ ] Create `src/utils/letterboxd.ts` with RSS fetching and parsing functions
- [ ] Create `scripts/sync-letterboxd.ts` to match and update ratings in markdown files
- [ ] Add `tsx` and XML parser to `package.json` dependencies
- [ ] Add `sync:letterboxd` script to `package.json`
- [ ] Add `letterboxdId` to existing movie markdown files (The Matrix)
- [ ] Test sync script with existing movies and verify ratings update correctly

---

## Notes

- **Branch:** Create new branch for this feature (good practice)
- **Username:** Woogles
- **RSS Feed:** `https://letterboxd.com/woogles/rss/`
- **Rating Scale:** Letterboxd (0-5 stars) → Website (0-10)
- **Preserve:** All custom content (reviews, tags, director) stays in markdown
- **Source of Truth:** Letterboxd for ratings, Markdown for custom content

---

## Questions to Consider

1. **Auto-create movies:** Should script create new markdown files for movies in Letterboxd but not in site?
2. **Sync frequency:** Auto-sync on every build, or manual trigger only?
3. **Rating conflicts:** Always use Letterboxd, or handle edge cases differently?

---

*Plan created: January 2025*  
*Last updated: January 2025*

