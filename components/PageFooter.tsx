import * as React from 'react'

import Giscus from '@giscus/react'

export const PageFooter: React.FC<{ isBlogPost: boolean }> = ({
  isBlogPost
}) => {
  if (isBlogPost) {
    return (
      <Giscus
        repo='snack-game/blog-comments'
        repoId='R_kgDOK3Nq-Q'
        category='Comments'
        categoryId='DIC_kwDOK3Nq-c4CblXz'
        mapping='pathname'
        reactionsEnabled='1'
        emitMetadata='0'
        theme='preferred_color_scheme'
        lang='ko'
      />
    );
  }
  return null;
}
