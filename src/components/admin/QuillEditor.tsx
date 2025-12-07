import React, { useEffect } from 'react'
import { useQuill } from 'react-quilljs'
import 'quill/dist/quill.snow.css'

type Props = {
  value?: string
  onChange?: (html: string) => void
}

export default function QuillEditor({ value = '', onChange }: Props) {
  const { quill, quillRef } = useQuill()

  useEffect(() => {
    if (!quill) return
    const handler = () => {
      onChange?.(quill.root.innerHTML)
    }
    quill.on('text-change', handler)
    // set initial content when quill becomes available
    if (value && quill.root.innerHTML !== value) quill.root.innerHTML = value
    return () => {
      quill.off('text-change', handler)
    }
  }, [quill, onChange, value])

  return <div ref={quillRef} />
}
