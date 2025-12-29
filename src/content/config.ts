import { defineCollection, z } from "astro:content";

const baseMediaSchema = z.object({
  title: z.string(),
  year: z.number().optional(),
  poster: z.string().optional(), // e.g. "/readme_images/the_matrix_poster.jpeg"
  rating: z.number().min(0).max(10).optional(),
  tags: z.array(z.string()).optional(),
  link: z.string().url().optional(),
  featured: z.boolean().optional(),
});

const movies = defineCollection({
  type: "content",
  schema: baseMediaSchema.extend({
    director: z.string().optional(),
    letterboxdId: z.string().optional(), // Letterboxd slug for syncing ratings
  }),
});

const books = defineCollection({
  type: "content",
  schema: baseMediaSchema.extend({
    author: z.string().optional(),
  }),
});

const tv = defineCollection({
  type: "content",
  schema: baseMediaSchema.extend({
    // later: type: "tv" | "anime" | "broadway" etc.
    category: z.string().optional(),
  }),
});

export const collections = { movies, books, tv };
