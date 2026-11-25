import fs from 'fs'
import { join } from 'path'
import matter from 'gray-matter'
import { tagToSlugClient } from './tags'

const postsDirectory = join(process.cwd(), 'content', '_posts')
const projectsDirectory = join(process.cwd(), 'content', '_projects')
const resumeDirectory = join(process.cwd(), 'content', '_resumes')

const WORDS_PER_MINUTE = 230

type Items = {
  [key: string]: any
}

function listMarkdown(dir: string) {
  return fs.readdirSync(dir).filter((file) => file.endsWith('.md'))
}

/** Normalizes the `tags` front matter (list or comma-separated string). */
function parseTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean)
  if (typeof raw === 'string') return raw.split(',').map((t) => t.trim()).filter(Boolean)
  return []
}

export const tagToSlug = tagToSlugClient

export function readingTimeMinutes(markdown: string) {
  const words = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .split(/\s+/)
    .filter(Boolean).length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

function readBySlug(dir: string, slug: string, fields: string[] = []) {
  const realSlug = slug.replace(/\.md$/, '')
  const fullPath = join(dir, `${realSlug}.md`)
  const fileContents = fs.readFileSync(fullPath, 'utf8')
  const { data, content } = matter(fileContents)

  const items: Items = {}

  // Ensure only the minimal needed data is exposed
  fields.forEach((field) => {
    if (field === 'slug') {
      items[field] = realSlug
    } else if (field === 'content') {
      items[field] = content
    } else if (field === 'tags') {
      items[field] = parseTags(data.tags)
    } else if (field === 'readingTime') {
      items[field] = readingTimeMinutes(content)
    } else if (typeof data[field] !== 'undefined') {
      items[field] = data[field]
    }
  })

  return items
}

function byDateDesc(a: Items, b: Items) {
  return a.date > b.date ? -1 : 1
}

function withField(fields: string[], field: string) {
  return fields.includes(field) ? fields : [...fields, field]
}

export function getPostSlugs() {
  return listMarkdown(postsDirectory)
}

export function getResumeSlugs() {
  return listMarkdown(resumeDirectory)
}

export function getProjectSlugs() {
  return listMarkdown(projectsDirectory)
}

export function getPostBySlug(slug: string, fields: string[] = []) {
  return readBySlug(postsDirectory, slug, fields)
}

export function getResumeBySlug(slug: string, fields: string[] = []) {
  return readBySlug(resumeDirectory, slug, fields)
}

export function getProjectBySlug(slug: string, fields: string[] = []) {
  return readBySlug(projectsDirectory, slug, fields)
}

/** Every post, drafts included, newest first. */
export function getAllPosts(fields: string[] = []) {
  return getPostSlugs()
    .map((slug) => getPostBySlug(slug, fields))
    .sort(byDateDesc)
}

/** Posts with `isPublished: true`, newest first. Use this for anything public. */
export function getPublishedPosts(fields: string[] = []) {
  return getAllPosts(withField(fields, 'isPublished')).filter((post) => post.isPublished === true)
}

export function getPostsByCategory(category: string, fields: string[] = []) {
  return getPublishedPosts(withField(fields, 'category')).filter((post) => post.category === category)
}

export function getPostsByTag(tagSlug: string, fields: string[] = []) {
  return getPublishedPosts(withField(fields, 'tags')).filter((post) =>
    (post.tags as string[]).some((tag) => tagToSlug(tag) === tagSlug)
  )
}

/** Tags used by published posts, with counts, most used first. */
export function getAllTags() {
  const counts = new Map<string, { tag: string; slug: string; count: number }>()
  getPublishedPosts(['tags']).forEach((post) => {
    ;(post.tags as string[]).forEach((tag) => {
      const slug = tagToSlug(tag)
      const entry = counts.get(slug) || { tag, slug, count: 0 }
      entry.count += 1
      counts.set(slug, entry)
    })
  })
  return Array.from(counts.values()).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

export function getAllResumes(fields: string[] = []) {
  return getResumeSlugs()
    .map((slug) => getResumeBySlug(slug, fields))
    .sort(byDateDesc)
}

export function getAllProjects(fields: string[] = []) {
  return getProjectSlugs()
    .map((slug) => getProjectBySlug(slug, fields))
    .sort(byDateDesc)
}

/** Projects with `isPublished: true`, newest first. */
export function getPublishedProjects(fields: string[] = []) {
  return getAllProjects(withField(fields, 'isPublished')).filter((p) => p.isPublished === true)
}
