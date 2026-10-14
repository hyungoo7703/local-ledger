import React, { useState } from 'react';
import { Tag, Plus, X } from 'lucide-react';

interface QuickTagSettingsProps {
  quickTags: string[];
  onAddTag: (tag: string) => void;
  onDeleteTag: (tag: string) => void;
}

/**
 * 자주 쓰는 태그 관리. 목록은 여기서만 바뀐다.
 * 플랜 등록 화면은 이 목록에서 고르거나 그 플랜에만 붙을 태그를 직접 적을 뿐, 목록에 등록하지 않는다.
 */
export const QuickTagSettings: React.FC<QuickTagSettingsProps> = ({
  quickTags,
  onAddTag,
  onDeleteTag
}) => {
  const [draft, setDraft] = useState('');
  const [notice, setNotice] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = draft.trim();
    if (!tag) return;
    // 대소문자만 다른 태그는 같은 것으로 본다. 등록 화면의 칩 선택 표시도 같은 기준이다.
    const existing = quickTags.find((t) => t.toLowerCase() === tag.toLowerCase());
    if (existing) {
      setNotice(`'${existing}'은(는) 이미 있습니다.`);
      return;
    }
    onAddTag(tag);
    setDraft('');
    setNotice('');
  };

  return (
    <div className="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 space-y-3">
      <div className="flex items-center gap-2 text-indigo-400">
        <Tag className="w-5 h-5" />
        <h3 className="text-sm font-bold text-white">자주 쓰는 태그</h3>
      </div>
      <p className="text-[11px] text-slate-400 leading-relaxed">
        플랜 등록 화면에서 한 번에 고를 수 있는 태그입니다. 목록은 여기서만 추가·삭제됩니다.
        등록 화면에서 직접 적은 태그는 그 플랜에만 붙고 목록에는 들어가지 않습니다.
      </p>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setNotice('');
          }}
          placeholder="예: 삼성LINK, T-day"
          maxLength={20}
          className="flex-1 min-w-0 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          추가
        </button>
      </form>
      {notice && <p className="text-[11px] text-amber-400">{notice}</p>}

      {quickTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {quickTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-slate-800 border border-slate-700/60 rounded-lg pl-2.5 pr-1 py-1 text-xs text-slate-200"
            >
              {tag}
              <button
                type="button"
                onClick={() => onDeleteTag(tag)}
                className="p-0.5 text-slate-500 hover:text-rose-400 active:scale-90 transition"
                aria-label={`${tag} 삭제`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 text-center py-2">등록된 태그가 없습니다.</p>
      )}
    </div>
  );
};
