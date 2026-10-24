import { createRoot } from 'react-dom/client'

import { loadTranslator } from './api'
import { App } from './app'

import './style.css'

const root = createRoot(document.querySelector('#root')!)

loadTranslator().then(
  ({ lang, t }) => {
    document.documentElement.lang = lang
    root.render(<App t={t} lang={lang} />)
  },
  (error: unknown) => {
    // Without the session token (a bookmarked or copied URL), the API refuses every call.
    root.render(
      <div className="loading">
        <p>{error instanceof Error ? error.message : String(error)}</p>
        <p>
          Run <code>zcf ui</code> again and open the address it prints.
        </p>
        <p lang="zh-CN">
          请重新运行 <code>zcf ui</code>，并打开它输出的地址。
        </p>
      </div>,
    )
  },
)
