/**
 * Letterboxd Sync Script
 * 
 * This script syncs movie ratings from Letterboxd to local markdown files.
 * It matches movies by letterboxdId (primary) or title + year (fallback).
 * 
 * Usage: npm run sync:letterboxd
 */

import { getLetterboxdMovies, type LetterboxdMovie } from '../src/utils/letterboxd.js';
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

const LETTERBOXD_USERNAME = 'Woogles';
const MOVIES_DIR = join(process.cwd(), 'src/content/movies');

interface MovieFrontmatter {
  title: string;
  year?: number;
  rating?: number;
  letterboxdId?: string;
  [key: string]: any;
}

/**
 * Reads all movie markdown files and returns their frontmatter
 */
function readMovieFiles(): Map<string, { path: string; frontmatter: MovieFrontmatter; content: string }> {
  const movies = new Map<string, { path: string; frontmatter: MovieFrontmatter; content: string }>();
  
  try {
    const files = readdirSync(MOVIES_DIR).filter(f => f.endsWith('.md'));
    
    for (const file of files) {
      const filePath = join(MOVIES_DIR, file);
      const fileContent = readFileSync(filePath, 'utf-8');
      const { data, content } = matter(fileContent);
      
      movies.set(file, {
        path: filePath,
        frontmatter: data as MovieFrontmatter,
        content,
      });
    }
  } catch (error) {
    console.error('Error reading movie files:', error);
  }
  
  return movies;
}

/**
 * Matches a Letterboxd movie to a local movie file
 */
function findMatchingMovie(
  letterboxdMovie: LetterboxdMovie,
  localMovies: Map<string, { path: string; frontmatter: MovieFrontmatter; content: string }>
): { key: string; movie: { path: string; frontmatter: MovieFrontmatter; content: string } } | null {
  // First, try to match by letterboxdId
  for (const [key, local] of localMovies.entries()) {
    if (local.frontmatter.letterboxdId === letterboxdMovie.letterboxdId) {
      return { key, movie: local };
    }
  }
  
  // Fallback: match by title and year
  for (const [key, local] of localMovies.entries()) {
    const titleMatch = local.frontmatter.title?.toLowerCase().trim() === letterboxdMovie.title.toLowerCase().trim();
    const yearMatch = !letterboxdMovie.year || !local.frontmatter.year || local.frontmatter.year === letterboxdMovie.year;
    
    if (titleMatch && yearMatch) {
      return { key, movie: local };
    }
  }
  
  return null;
}

/**
 * Creates a filename from a movie title (slugified)
 */
function createFilename(title: string, year: number | null): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const yearSuffix = year ? `-${year}` : '';
  return `${slug}${yearSuffix}.md`;
}

/**
 * Creates a new markdown file for a movie from Letterboxd
 */
function createMovieFile(letterboxdMovie: LetterboxdMovie): void {
  const filename = createFilename(letterboxdMovie.title, letterboxdMovie.year);
  const filePath = join(MOVIES_DIR, filename);
  
  // Check if file already exists (shouldn't happen, but safety check)
  try {
    readFileSync(filePath, 'utf-8');
    console.log(`  ⚠️  File already exists: ${filename}, skipping creation`);
    return;
  } catch {
    // File doesn't exist, proceed with creation
  }
  
  const frontmatter: MovieFrontmatter = {
    title: letterboxdMovie.title,
    year: letterboxdMovie.year || undefined,
    rating: letterboxdMovie.rating,
    letterboxdId: letterboxdMovie.letterboxdId,
    link: letterboxdMovie.letterboxdUrl,
  };
  
  // Add poster if available
  if (letterboxdMovie.poster) {
    frontmatter.poster = letterboxdMovie.poster;
  }
  
  const content = matter.stringify(letterboxdMovie.review || '', frontmatter, {
    delimiters: '---',
  });
  
  writeFileSync(filePath, content, 'utf-8');
  console.log(`  ✨ Created new file: ${filename}`);
}

/**
 * Updates a movie markdown file with new rating and letterboxdId
 */
function updateMovieFile(
  filePath: string,
  frontmatter: MovieFrontmatter,
  content: string,
  letterboxdMovie: LetterboxdMovie
): void {
  // Update rating (Letterboxd wins)
  frontmatter.rating = letterboxdMovie.rating;
  
  // Ensure letterboxdId is set
  if (!frontmatter.letterboxdId) {
    frontmatter.letterboxdId = letterboxdMovie.letterboxdId;
  }
  
  // Update link if missing
  if (!frontmatter.link) {
    frontmatter.link = letterboxdMovie.letterboxdUrl;
  }
  
  // Update poster if available (Letterboxd wins)
  if (letterboxdMovie.poster) {
    frontmatter.poster = letterboxdMovie.poster;
  }
  
  // Update review content if available (Letterboxd is the source of truth)
  let updatedContent = content;
  if (letterboxdMovie.review) {
    // Always update from Letterboxd - it's the single source of truth
    updatedContent = letterboxdMovie.review.trim();
  }
  
  // Write back to file
  const finalContent = matter.stringify(updatedContent, frontmatter, {
    delimiters: '---',
  });
  
  writeFileSync(filePath, finalContent, 'utf-8');
}

/**
 * Main sync function
 */
async function syncLetterboxd(): Promise<void> {
  console.log(`🔄 Syncing Letterboxd ratings for user: ${LETTERBOXD_USERNAME}`);
  
  try {
    // Fetch Letterboxd data
    console.log('📡 Fetching Letterboxd RSS feed...');
    const letterboxdMovies = await getLetterboxdMovies(LETTERBOXD_USERNAME);
    console.log(`✅ Found ${letterboxdMovies.length} movies in Letterboxd`);
    
    // Read local movie files
    console.log('📚 Reading local movie files...');
    const localMovies = readMovieFiles();
    console.log(`✅ Found ${localMovies.size} local movie files`);
    
    // Match and update/create
    let updated = 0;
    let created = 0;
    let addedLetterboxdId = 0;
    
    for (const letterboxdMovie of letterboxdMovies) {
      const match = findMatchingMovie(letterboxdMovie, localMovies);
      
      if (match) {
        const { movie } = match;
        const hadLetterboxdId = !!movie.frontmatter.letterboxdId;
        const ratingChanged = movie.frontmatter.rating !== letterboxdMovie.rating;
        const posterAdded = letterboxdMovie.poster && !movie.frontmatter.poster;
        const reviewUpdated = letterboxdMovie.review && (!movie.content.trim() || movie.content.trim().toLowerCase() === 'test');
        
        updateMovieFile(match.movie.path, movie.frontmatter, movie.content, letterboxdMovie);
        
        if (!hadLetterboxdId) {
          addedLetterboxdId++;
          console.log(`  ✨ Added letterboxdId to: ${movie.frontmatter.title}`);
        }
        
        if (ratingChanged) {
          updated++;
          console.log(`  ⭐ Updated rating for: ${movie.frontmatter.title} (${movie.frontmatter.rating} → ${letterboxdMovie.rating})`);
        }
        
        if (posterAdded) {
          console.log(`  🎬 Added poster for: ${movie.frontmatter.title}`);
        }
        
        if (reviewUpdated) {
          console.log(`  📝 Updated review for: ${movie.frontmatter.title}`);
        }
      } else {
        // Auto-create new movie file from Letterboxd
        createMovieFile(letterboxdMovie);
        created++;
      }
    }
    
    // Report results
    console.log('\n📊 Sync Summary:');
    console.log(`  ✅ Updated ratings: ${updated}`);
    console.log(`  ✨ Created new movies: ${created}`);
    console.log(`  🔗 Added letterboxdId: ${addedLetterboxdId}`);
    
    console.log('\n✅ Sync complete!');
    
  } catch (error) {
    console.error('❌ Error during sync:', error);
    process.exit(1);
  }
}

// Run the sync
syncLetterboxd();

