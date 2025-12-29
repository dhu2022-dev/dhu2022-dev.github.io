/**
 * Letterboxd RSS Feed Integration
 * Fetches and parses Letterboxd RSS feed to extract movie ratings
 */

export interface LetterboxdMovie {
  title: string;
  year: number | null;
  rating: number; // 0-10 scale
  letterboxdId: string; // Slug from URL (e.g., "the-matrix-1999")
  letterboxdUrl: string;
  watchedDate: string | null;
}

/**
 * Fetches the Letterboxd RSS feed for a given username
 */
export async function fetchLetterboxdRSS(username: string): Promise<string> {
  const url = `https://letterboxd.com/${username}/rss/`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch Letterboxd RSS: ${response.status} ${response.statusText}`);
  }
  
  return await response.text();
}

/**
 * Extracts the Letterboxd ID (slug) from a Letterboxd URL
 * Examples:
 * - "https://letterboxd.com/film/the-matrix-1999/" -> "the-matrix-1999"
 * - "https://letterboxd.com/woogles/film/the-matrix/" -> "the-matrix"
 */
function extractLetterboxdId(url: string): string | null {
  const match = url.match(/letterboxd\.com\/[^\/]+\/film\/([^\/]+)/) || url.match(/letterboxd\.com\/film\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Converts Letterboxd star rating to 0-10 scale
 * Letterboxd uses 0-5 stars (or half stars), we use 0-10
 */
function convertRating(letterboxdRating: string | null): number | null {
  if (!letterboxdRating) return null;
  
  // Letterboxd ratings are in format like "4.5" or "5" (out of 5)
  const stars = parseFloat(letterboxdRating);
  if (isNaN(stars) || stars < 0 || stars > 5) return null;
  
  // Convert to 0-10 scale
  return Math.round(stars * 2 * 10) / 10; // Round to 1 decimal
}

/**
 * Parses Letterboxd RSS XML and extracts movie data
 */
export async function parseLetterboxdRSS(xml: string): Promise<LetterboxdMovie[]> {
  const { XMLParser } = await import('fast-xml-parser');
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseTagValue: true,
    parseTrueNumberOnly: false,
  });
  
  const result = parser.parse(xml);
  const items = result?.rss?.channel?.item || [];
  
  // Handle single item (not an array)
  const itemsArray = Array.isArray(items) ? items : (items ? [items] : []);
  
  const movies: LetterboxdMovie[] = [];
  
  for (const item of itemsArray) {
    // Letterboxd uses namespaced elements: letterboxd:filmTitle, letterboxd:filmYear, letterboxd:memberRating
    const filmTitle = item['letterboxd:filmTitle']?.['#text'] || item['letterboxd:filmTitle'] || '';
    const filmYear = item['letterboxd:filmYear']?.['#text'] || item['letterboxd:filmYear'];
    const memberRating = item['letterboxd:memberRating']?.['#text'] || item['letterboxd:memberRating'];
    const link = item.link?.['#text'] || item.link || '';
    const pubDate = item.pubDate?.['#text'] || item.pubDate || null;
    
    // Fallback to title parsing if namespaced fields aren't available
    const title = filmTitle || (item.title?.['#text'] || item.title || '');
    const year = filmYear ? parseInt(String(filmYear), 10) : null;
    
    // Rating is in letterboxd:memberRating (0-5 scale)
    // If not found, try to extract from title (e.g., "Movie Title - ★★★★")
    let rating: number | null = null;
    if (memberRating !== undefined && memberRating !== null) {
      rating = convertRating(String(memberRating));
    } else {
      // Fallback: try to extract from title stars
      const titleText = item.title?.['#text'] || item.title || '';
      const starMatch = titleText.match(/★+/);
      if (starMatch) {
        const stars = starMatch[0].length;
        rating = convertRating(String(stars));
      }
    }
    
    // Extract Letterboxd ID from URL
    const letterboxdId = extractLetterboxdId(link);
    
    // Clean title (remove year and rating if present)
    const cleanTitle = title
      .replace(/\s*-\s*★+.*$/, '') // Remove " - ★★★★" suffix
      .replace(/\s*,\s*\d{4}.*$/, '') // Remove ", 1999" suffix
      .replace(/\s*\(\d{4}\)\s*$/, '') // Remove " (1999)" suffix
      .trim();
    
    if (cleanTitle && letterboxdId && rating !== null) {
      movies.push({
        title: cleanTitle,
        year,
        rating,
        letterboxdId,
        letterboxdUrl: link,
        watchedDate: pubDate,
      });
    }
  }
  
  return movies;
}

/**
 * Main function to fetch and parse Letterboxd data
 */
export async function getLetterboxdMovies(username: string): Promise<LetterboxdMovie[]> {
  try {
    const xml = await fetchLetterboxdRSS(username);
    return await parseLetterboxdRSS(xml);
  } catch (error) {
    console.error('Error fetching Letterboxd data:', error);
    throw error;
  }
}

