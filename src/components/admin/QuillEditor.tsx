import React, { useEffect, useImperativeHandle, forwardRef } from 'react'
import { useQuill } from 'react-quilljs'
import 'quill/dist/quill.snow.css'

type Props = {
  value?: string
  onChange?: (html: string) => void
}

export type QuillEditorHandle = {
  insertImage: (url: string) => void
  getHTML: () => string
  setHTML: (html: string) => void
}

const QuillEditor = forwardRef<QuillEditorHandle, Props>(({ value = '', onChange }, ref) => {
  const { quill, quillRef } = useQuill()

  useEffect(() => {
    if (!quill) return
    const handler = () => {
      onChange?.(quill.root.innerHTML)
    }
    quill.on('text-change', handler)
    // set initial content when quill becomes available using clipboard to preserve embeds
    if (value && quill.root.innerHTML !== value) {
      quill.clipboard.dangerouslyPasteHTML(0, value)
    }
    return () => {
      quill.off('text-change', handler)
    }
  }, [quill, onChange, value])

  useImperativeHandle(ref, () => ({
    insertImage: (url: string) => {
      if (!quill) return
      try {
        const range = quill.getSelection(true)
        const index = (range && typeof range.index === 'number') ? range.index : quill.getLength()
        // insert image embed at current cursor
        quill.insertEmbed(index, 'image', url, 'user')
        // move cursor after image
        quill.setSelection(index + 1, 0)
        // trigger change event handlers (Quill does this automatically)
      } catch (err) {
        console.error('Error inserting image into Quill:', err)
      }
    },
    getHTML: () => {
      if (!quill) return ''
      return quill.root.innerHTML
    },
    setHTML: (html: string) => {
      if (!quill) return
      quill.clipboard.dangerouslyPasteHTML(0, html)
    }
  }), [quill])

  return <div ref={quillRef} />
})

export default QuillEditor
