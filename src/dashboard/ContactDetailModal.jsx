import { useState } from 'react'
import { X, Phone, Mail, MapPin, StickyNote, PhoneCall } from 'lucide-react'
import { listInteractions, addInteraction, updateContactTags, PIPELINE_STAGES } from '../lib/crm'
import { LIGHT } from '../theme'
import { initialsOf, LoadingState, ErrorState, ErrorBanner } from './ui'
import { FieldLabel, ErrorText, usePendingAction } from '../auth/ui'
import { useAsyncData } from './useAsyncData'

function formatWhen(iso) {
  return new Date(iso).toLocaleString('en-CA', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// Opened by clicking a card on the pipeline board (see ClientsPage.jsx).
// Two things live here that the compact card can't show: the tag editor
// and the interaction timeline (view + add note/log call).
export default function ContactDetailModal({ contact, allTags, onClose, onTagsChanged }) {
  const [interactions, setInteractions] = useState([])
  const [tags, setTags] = useState(contact.tags || [])
  const [tagInput, setTagInput] = useState('')
  const [tagError, setTagError] = useState('')
  const [composerType, setComposerType] = useState('note')
  const [composerBody, setComposerBody] = useState('')
  const { loading: posting, error: postError, run: runPost } = usePendingAction()

  async function load() {
    const data = await listInteractions(contact.id)
    setInteractions(data)
  }
  const { loading, error, hasLoadedOnce, reload } = useAsyncData(load, [contact.id])

  async function saveTags(nextTags) {
    const prev = tags
    setTags(nextTags) // optimistic
    setTagError('')
    try {
      await updateContactTags(contact.id, nextTags)
      onTagsChanged(contact.id, nextTags)
    } catch (err) {
      setTags(prev)
      setTagError(err.message)
    }
  }

  function addTag(raw) {
    const t = raw.trim()
    if (!t || tags.includes(t)) return
    saveTags([...tags, t])
    setTagInput('')
  }
  function removeTag(t) {
    saveTags(tags.filter((x) => x !== t))
  }

  function submitInteraction() {
    if (!composerBody.trim()) return
    runPost(async () => {
      await addInteraction({ customerId: contact.id, type: composerType, body: composerBody.trim() })
      setComposerBody('')
      await reload()
    })
  }

  const stageLabel = PIPELINE_STAGES.find((s) => s.key === contact.pipeline_stage)?.label
  const tagSuggestions = tagInput
    ? allTags.filter((t) => !tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase())).slice(0, 6)
    : []

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 60 }} onClick={onClose}>
      <div style={{ background: LIGHT.card, borderRadius: '20px 20px 0 0', padding: 22, width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 19, background: LIGHT.accentSoft, color: LIGHT.accent, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {initialsOf(contact.name)}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: LIGHT.ink }}>{contact.name}</div>
              <div style={{ fontSize: 11, color: LIGHT.sub }}>{stageLabel}</div>
            </div>
          </div>
          <button className="tap" onClick={onClose}><X size={20} color={LIGHT.sub} /></button>
        </div>

        <div style={{ background: LIGHT.bg, borderRadius: 14, padding: 14, marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {contact.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: LIGHT.ink }}><Phone size={13} color={LIGHT.accent} /> {contact.phone}</div>}
          {contact.email && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: LIGHT.ink }}><Mail size={13} color={LIGHT.accent} /> {contact.email}</div>}
          {contact.address && <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: LIGHT.ink }}><MapPin size={13} color={LIGHT.accent} /> {contact.address}</div>}
          {!contact.phone && !contact.email && !contact.address && <div style={{ fontSize: 12, color: LIGHT.sub }}>No contact details on file.</div>}
        </div>

        <FieldLabel>Tags</FieldLabel>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {tags.map((t) => (
            <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, background: LIGHT.accentSoft, color: LIGHT.accent, borderRadius: 20, padding: '4px 6px 4px 10px', fontSize: 11.5, fontWeight: 600 }}>
              {t}
              <button className="tap" onClick={() => removeTag(t)} style={{ display: 'flex', color: LIGHT.accent }}><X size={11} /></button>
            </span>
          ))}
          {tags.length === 0 && <span style={{ fontSize: 11.5, color: LIGHT.sub }}>No tags yet.</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) } }}
            placeholder="e.g. repeat customer, referred by Sarah"
            style={{ flex: 1, minWidth: 0, background: '#F5F5F7', border: `1px solid ${LIGHT.border}`, borderRadius: 10, fontSize: 13, padding: '9px 12px', color: LIGHT.ink }}
          />
          <button className="tap" onClick={() => addTag(tagInput)} disabled={!tagInput.trim()} style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', background: tagInput.trim() ? LIGHT.accent : LIGHT.border, borderRadius: 10, padding: '0 16px' }}>
            Add
          </button>
        </div>
        {tagSuggestions.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {tagSuggestions.map((s) => (
              <button key={s} className="tap" onClick={() => addTag(s)} style={{ fontSize: 11, color: LIGHT.sub, border: `1px dashed ${LIGHT.border}`, borderRadius: 20, padding: '3px 10px' }}>
                + {s}
              </button>
            ))}
          </div>
        )}
        <ErrorText>{tagError}</ErrorText>

        <FieldLabel>Timeline</FieldLabel>
        <div style={{ background: LIGHT.bg, borderRadius: 14, padding: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            <button
              className="tap"
              onClick={() => setComposerType('note')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, borderRadius: 8, padding: '6px 10px', background: composerType === 'note' ? LIGHT.ink : LIGHT.card, color: composerType === 'note' ? LIGHT.bg : LIGHT.sub }}
            >
              <StickyNote size={12} /> Note
            </button>
            <button
              className="tap"
              onClick={() => setComposerType('call')}
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, borderRadius: 8, padding: '6px 10px', background: composerType === 'call' ? LIGHT.ink : LIGHT.card, color: composerType === 'call' ? LIGHT.bg : LIGHT.sub }}
            >
              <PhoneCall size={12} /> Call
            </button>
          </div>
          <textarea
            value={composerBody}
            onChange={(e) => setComposerBody(e.target.value)}
            placeholder={composerType === 'call' ? 'What happened on the call?' : 'Anything worth remembering about this contact...'}
            rows={3}
            style={{ width: '100%', background: LIGHT.card, border: `1px solid ${LIGHT.border}`, borderRadius: 10, fontSize: 13, padding: 10, color: LIGHT.ink, marginBottom: 8, resize: 'none' }}
          />
          <ErrorText>{postError}</ErrorText>
          <button
            className="tap"
            onClick={submitInteraction}
            disabled={posting || !composerBody.trim()}
            style={{ width: '100%', textAlign: 'center', background: composerBody.trim() ? LIGHT.ink : LIGHT.border, color: LIGHT.bg, border: 'none', borderRadius: 10, padding: '10px 0', fontSize: 13, fontWeight: 600 }}
          >
            {posting ? 'Adding…' : `Add ${composerType === 'call' ? 'Call' : 'Note'}`}
          </button>
        </div>

        {loading && <LoadingState />}
        {error && !hasLoadedOnce && <ErrorState message={error} onRetry={reload} />}
        {!loading && (
          <>
            <ErrorBanner message={error && hasLoadedOnce ? error : ''} onRetry={reload} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {interactions.map((i) => (
                <div key={i.id} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 13, background: i.type === 'call' ? LIGHT.infoSoft : LIGHT.accentSoft, color: i.type === 'call' ? LIGHT.info : LIGHT.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {i.type === 'call' ? <PhoneCall size={12} /> : <StickyNote size={12} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, color: LIGHT.ink, lineHeight: 1.4 }}>{i.body}</div>
                    <div style={{ fontSize: 10.5, color: LIGHT.sub, marginTop: 2 }}>{i.created_by?.name || 'Someone'} · {formatWhen(i.created_at)}</div>
                  </div>
                </div>
              ))}
              {interactions.length === 0 && <div style={{ fontSize: 12, color: LIGHT.sub, textAlign: 'center', padding: '10px 0' }}>No interactions logged yet.</div>}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
