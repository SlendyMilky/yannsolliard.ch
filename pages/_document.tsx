import * as React from 'react';
import Document, { Head, Html, Main, NextScript } from 'next/document';
import { IconContext } from 'react-icons';

export default class MyDocument extends Document {
  render() {
    return (
      <IconContext.Provider value={{ style: { verticalAlign: 'middle' } }}>
        <Html lang="en">
          <Head>
            <link rel="shortcut icon" href="/favicon.ico" />
            <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
            <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
            <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />
            <link rel="manifest" href="/manifest.json" />
          </Head>
          <body>
            <script
              dangerouslySetInnerHTML={{
                __html: `
(function () {
  var storageKey = 'darkMode';
  var classNameDark = 'dark-mode';
  var classNameLight = 'light-mode';

  function setClassOnDocumentBody(darkMode) {
    document.body.classList.toggle(classNameDark, darkMode);
    document.body.classList.toggle(classNameLight, !darkMode);
  }

  var mql = window.matchMedia('(prefers-color-scheme: dark)');
  var supportsColorSchemeQuery = mql.media === '(prefers-color-scheme: dark)';
  var localStorageTheme;

  try {
    localStorageTheme = localStorage.getItem(storageKey);
    if (localStorageTheme !== null) {
      localStorageTheme = JSON.parse(localStorageTheme);
    }
  } catch (err) {}

  if (localStorageTheme !== null) {
    setClassOnDocumentBody(localStorageTheme);
  } else if (supportsColorSchemeQuery) {
    setClassOnDocumentBody(mql.matches);
    localStorage.setItem(storageKey, mql.matches);
  } else {
    var isDarkMode = document.body.classList.contains(classNameDark);
    localStorage.setItem(storageKey, JSON.stringify(isDarkMode));
  }
})();
                `,
              }}
            />
            <Main />
            <NextScript />
          </body>
        </Html>
      </IconContext.Provider>
    );
  }
}
