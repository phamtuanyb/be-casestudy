'use client'

import React, { useCallback, useEffect } from 'react'
import { FieldLabel, TextInput, useField, useForm, useFormFields } from '@payloadcms/ui'

import { formatSlug } from './formatSlug'

type SlugComponentProps = {
  field?: { label?: string }
  path?: string
  readOnly?: boolean
  fieldToUse: string
  checkboxFieldPath: string
}

export const SlugComponent: React.FC<SlugComponentProps> = ({
  field,
  path,
  readOnly: readOnlyFromProps,
  fieldToUse,
  checkboxFieldPath,
}) => {
  const fieldPath = path || 'slug'
  const label = field?.label || 'Đường dẫn (slug)'

  const { value, setValue } = useField<string>({ path: fieldPath })
  const { dispatchFields } = useForm()

  // Cờ khoá (đang tự sinh?) và giá trị field nguồn (vd title)
  const locked = useFormFields(([fields]) => Boolean(fields[checkboxFieldPath]?.value))
  const sourceValue = useFormFields(([fields]) => fields[fieldToUse]?.value as string | undefined)

  // Khi đang khoá: tự cập nhật slug theo field nguồn (live khi gõ)
  useEffect(() => {
    if (!locked) return
    const next = sourceValue ? formatSlug(sourceValue) : ''
    if (value !== next) setValue(next)
  }, [sourceValue, locked, value, setValue])

  const toggleLock = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dispatchFields({ type: 'UPDATE', path: checkboxFieldPath, value: !locked })
    },
    [locked, checkboxFieldPath, dispatchFields],
  )

  const readOnly = readOnlyFromProps || locked

  return (
    <div className="field-type slug-field-component">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <FieldLabel htmlFor={`field-${fieldPath}`} label={label} />
        <button
          type="button"
          onClick={toggleLock}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontSize: '0.72rem',
            fontWeight: 600,
            textDecoration: 'underline',
            color: 'var(--theme-elevation-500)',
          }}
        >
          {locked ? 'Mở khoá để sửa' : 'Khoá (tự sinh)'}
        </button>
      </div>
      <TextInput
        path={fieldPath}
        value={value}
        readOnly={Boolean(readOnly)}
        onChange={(e: { target: { value: string } }) => setValue(e.target.value)}
      />
    </div>
  )
}

export default SlugComponent
