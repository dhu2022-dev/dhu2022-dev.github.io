# Letterboxd Sync Guide

## Overview

**Letterboxd is now your single source of truth for movie ratings!** 

This integration automatically:
- ✅ Creates new movie markdown files when you log movies on Letterboxd
- ✅ Updates ratings from Letterboxd
- ✅ Syncs before every build (no manual steps needed)

**You only need to log movies on Letterboxd** - everything else is automatic.

## How It Works

1. **Log a movie on Letterboxd** (add to diary with a rating)
2. **Build your site** (`npm run build`) - sync happens automatically
3. **That's it!** The movie appears on your website with the rating from Letterboxd

The sync script:
- Fetches your Letterboxd diary RSS feed
- **Auto-creates** markdown files for new movies
- Updates ratings for existing movies
- Matches by `letterboxdId` or title + year

## Workflow

### Fully Automated (Recommended) ✨

**You don't need to do anything!** GitHub Actions automatically:
- ✅ Syncs from Letterboxd every Monday at 9 AM UTC
- ✅ Commits any new movies or rating updates
- ✅ Builds and deploys your site automatically

**Just log movies on Letterboxd** - the rest happens automatically!

You can also manually trigger the sync:
1. Go to your GitHub repo → Actions tab
2. Select "Sync Letterboxd and Deploy"
3. Click "Run workflow"

### Manual Workflow (Optional)

If you want to sync and deploy manually:
```bash
npm run build  # Sync happens automatically via prebuild hook
git add .
git commit -m "Update movies from Letterboxd"
git push
```

Or just sync without building:
```bash
npm run sync:letterboxd
```

## Important Limitations

⚠️ **RSS Feed Limitation**: Letterboxd RSS feeds only show **recent diary entries** (typically the last 20-50 entries). This means:

- ✅ **New movies you log** will automatically appear on your site
- ✅ **Recent movies** will have their ratings updated automatically  
- ⚠️ **Older movies** won't sync unless you re-log them on Letterboxd

**This is a Letterboxd limitation, not a bug in our sync script.**

### Workaround for Older Movies

If you have many older movies you want to sync:
1. Re-log them on Letterboxd (just add to diary again - quick process)
2. Or manually create the markdown files (they'll still sync ratings going forward)

## Automatic Sync

The sync happens in two ways:

1. **GitHub Actions (Weekly)**: Automatically syncs, commits, builds, and deploys every Monday
2. **On Build (`prebuild` hook)**: Syncs automatically before every manual build

This means:
- ✅ Ratings are always up-to-date when you deploy
- ✅ New movies are automatically added
- ✅ No manual sync step needed
- ✅ Fully automated weekly updates

## Custom Content

You can still add custom content to your movie markdown files:
- Custom reviews/notes
- Tags
- Director info
- Poster images
- Featured status

The sync script **only updates**:
- `rating` (from Letterboxd)
- `letterboxdId` (if missing)
- `link` (Letterboxd URL, if missing)

Everything else is preserved!

## Troubleshooting

**No movies found in sync:**
- Check that you have recent diary entries on Letterboxd
- Verify your username is correct (`Woogles`)

**Movies not matching:**
- Ensure `letterboxdId` is set correctly in your markdown file
- Or verify title and year match exactly

**Rating not updating:**
- Check that the movie is in your Letterboxd diary (not just watchlist)
- Verify the rating was saved on Letterboxd

