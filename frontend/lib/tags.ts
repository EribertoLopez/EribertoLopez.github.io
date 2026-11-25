/** URL-safe form of a tag, e.g. "Systems Design" -> "systems-design". Safe to use in the browser. */
export function tagToSlugClient(tag: string) {
  return tag
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
