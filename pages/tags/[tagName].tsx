import React from 'react';
import { domain, isDev, rootNotionPageId } from 'lib/config';
import { resolveNotionPage } from 'lib/resolve-notion-page';
import omit from 'lodash.omit';
import { ExtendedRecordMap } from 'notion-types';
import { normalizeTitle } from 'notion-utils';

import { NotionPage } from '@/components/NotionPage';

const tagsPropertyNameLowerCase = 'tags';

const getCollectionAndSchema = (recordMap) => {
  const collection = Object.values(recordMap.collection)[0]?.value;
  if (!collection) return null;

  const propertyToFilter = Object.entries(collection.schema).find(
    (property) => property[1]?.name?.toLowerCase() === tagsPropertyNameLowerCase
  );

  return { collection, propertyToFilter: propertyToFilter?.[1] };
};

const filterBlocksByTag = ({ recordMap, collection, galleryView, rawTagName }) => {
  const filteredValue = normalizeTitle(rawTagName);
  const query =
    recordMap.collection_query[collection.id]?.[galleryView.id];
  const queryResults = query?.collection_group_results ?? query;

  if (queryResults) {
    const propertyToFilterId = Object.keys(collection.schema).find(
      (key) => collection.schema[key].name.toLowerCase() === tagsPropertyNameLowerCase
    );

    return queryResults.blockIds.filter((id) => {
      const block = recordMap.block[id]?.value;
      if (!block || !block.properties) return false;

      const value = block.properties[propertyToFilterId]?.[0]?.[0];
      if (!value) return false;

      return value.split(',').some(
        (val) => normalizeTitle(val) === filteredValue
      );
    });
  }

  return [];
};

export const getStaticProps = async (context) => {
  const rawTagName = (context.params?.tagName || '').toLowerCase();
  try {
    const props = await resolveNotionPage(domain, rootNotionPageId);

    if (props?.recordMap) {
      const { collection, propertyToFilter } = getCollectionAndSchema(props.recordMap);

      if (propertyToFilter) {
        const galleryView = Object.values(props.recordMap.collection_view).find(
          (view) => view.value?.type === 'gallery'
        )?.value;

        if (galleryView) {
          const block = Object.values(props.recordMap.block).find(
            (block) =>
              block.value?.type === 'collection_view' &&
              block.value.view_ids?.includes(galleryView.id)
          );

          if (block?.value) {
            props.recordMap.block = {
              [block.value.id]: block,
              ...omit(props.recordMap.block, [block.value.id])
            };

            const blockIds = filterBlocksByTag({
              recordMap: props.recordMap,
              collection,
              galleryView,
              rawTagName
            });

            props.recordMap.collection_query[collection.id][galleryView.id].blockIds = blockIds;
          }
        }
      }
    }

    return {
      props: {
        ...props,
        tagsPage: true,
        propertyToFilterName: rawTagName
      },
      revalidate: 10
    };
  } catch (err) {
    console.error('page error', domain, rawTagName, err);
    throw err;
  }
};

export const getStaticPaths = async () => {
  if (!isDev) {
    const props = await resolveNotionPage(domain, rootNotionPageId);

    if (props?.recordMap) {
      const { collection, propertyToFilter } = getCollectionAndSchema(props.recordMap);

      if (propertyToFilter?.options) {
        const paths = propertyToFilter.options
          .map((option) => normalizeTitle(option.value))
          .filter(Boolean)
          .map((slug) => `/tags/${slug}`);

        return {
          paths,
          fallback: true
        };
      }
    }
  }

  return {
    paths: [],
    fallback: true
  };
};

export default function NotionTagsPage(props) {
  return <NotionPage {...props} />;
}
