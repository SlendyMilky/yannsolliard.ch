// Import necessary modules and functions
import { NextApiRequest, NextApiResponse } from 'next'
import got from 'got'
import { PageBlock } from 'notion-types'
import { getBlockIcon, getBlockTitle, getPageProperty, isUrl, parsePageId } from 'notion-utils'
import * as libConfig from '@/lib/config'
import { mapImageUrl } from '@/lib/map-image-url'
import { notion } from '@/lib/notion-api'
import { NotionPageInfo } from '@/lib/types'

export default async (req: NextApiRequest, res: NextApiResponse) => {
  // Handle non-POST requests
  if (req.method !== 'POST') {
    return res.status(405).send({ error: 'method not allowed' })
  }

  // Parse and validate the page ID
  const pageId: string = parsePageId(req.body.pageId)
  if (!pageId) {
    throw new Error('Invalid notion page id')
  }

  // Retrieve the record map for the given page ID
  const recordMap = await notion.getPage(pageId)
  const block = getFirstBlock(recordMap)

  // Validate block and workspace
  validateBlock(block, pageId)
  validateWorkspace(block)

  // Gather and map images
  const [authorImage, image] = await getImages(block, recordMap)

  // Fetch additional information
  const author = getPageProperty<string>('Author', block, recordMap) || libConfig.author
  const { date, detail } = getPostDetails(block, recordMap, author)

  // Assemble the page info
  const pageInfo: NotionPageInfo = createPageInfo(pageId, block, recordMap, image, authorImage, detail)

  // Set cache headers and return the response
  setCacheControl(res)
  res.status(200).json(pageInfo)
}

function getFirstBlock(recordMap: any): PageBlock {
  const keys = Object.keys(recordMap?.block || {})
  const block = recordMap?.block?.[keys[0]]?.value

  if (!block) {
    throw new Error('Invalid recordMap for page')
  }
  return block
}

function validateBlock(block: PageBlock, pageId: string) {
  if (
    block.space_id &&
    libConfig.rootNotionSpaceId &&
    block.space_id !== libConfig.rootNotionSpaceId
  ) {
    throw new Error(`Notion page "${pageId}" belongs to a different workspace.`)
  }
}

function validateWorkspace(block: PageBlock) {
  const blockSpaceId = block.space_id
  if (
    blockSpaceId &&
    libConfig.rootNotionSpaceId &&
    blockSpaceId !== libConfig.rootNotionSpaceId
  ) {
    throw new Error(`Notion page belongs to a different workspace.`)
  }
}

async function getImages(block: PageBlock, recordMap: any): Promise<[string | null, string | null]> {
  const imageBlockUrl = mapImageUrl(
    getPageProperty<string>('Social Image', block, recordMap) ||
    block.format?.page_cover,
    block
  )
  const imageFallbackUrl = mapImageUrl(libConfig.defaultPageCover, block)
  const blockIcon = getBlockIcon(block, recordMap)
  const authorImageBlockUrl = mapImageUrl(blockIcon && isUrl(blockIcon) ? blockIcon : null, block)
  const authorImageFallbackUrl = mapImageUrl(libConfig.defaultPageIcon, block)

  return await Promise.all([
    getCompatibleImageUrl(authorImageBlockUrl, authorImageFallbackUrl),
    getCompatibleImageUrl(imageBlockUrl, imageFallbackUrl)
  ])
}

function getPostDetails(block: PageBlock, recordMap: any, author: string) {
  const isBlogPost = block.type === 'page' && block.parent_table === 'collection'
  const publishedTime = getPageProperty<number>('Published', block, recordMap)
  const datePublished = publishedTime ? new Date(publishedTime) : undefined
  const date = isBlogPost && datePublished ? formatDate(datePublished) : undefined
  const detail = date || author || libConfig.domain

  return { date, detail }
}

function formatDate(date: Date): string {
  return `${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}`
}

function createPageInfo(pageId: string, block: PageBlock, recordMap: any, image: string | null, authorImage: string | null, detail: string | undefined): NotionPageInfo {
  const title = getBlockTitle(block, recordMap) || libConfig.name
  const imageCoverPosition = block.format?.page_cover_position ?? libConfig.defaultPageCoverPosition
  const imageObjectPosition = imageCoverPosition ? `center ${(1 - imageCoverPosition) * 100}%` : null

  return {
    pageId,
    title,
    image,
    imageObjectPosition,
    author: getPageProperty<string>('Author', block, recordMap) || libConfig.author,
    authorImage,
    detail
  }
}

function setCacheControl(res: NextApiResponse) {
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, max-age=3600, stale-while-revalidate=3600'
  )
}

async function isUrlReachable(url: string | null): Promise<boolean> {
  if (!url) return false

  try {
    await got.head(url)
    return true
  } catch (err) {
    return false
  }
}

async function getCompatibleImageUrl(url: string | null, fallbackUrl: string | null): Promise<string | null> {
  const image = (await isUrlReachable(url)) ? url : fallbackUrl

  if (image) {
    const imageUrl = new URL(image)
    if (imageUrl.host === 'images.unsplash.com') {
      if (!imageUrl.searchParams.has('w')) {
        imageUrl.searchParams.set('w', '1200')
        imageUrl.searchParams.set('fit', 'max')
        return imageUrl.toString()
      }
    }
  }

  return image
}
