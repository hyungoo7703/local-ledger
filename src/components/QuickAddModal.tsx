import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Plus, Calendar, Tag, Check, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DealItem } from '../types';
import { generateId, getTodayString } from '../utils/formatters';
import { parseQuickEntry } from '../utils/parser';

interface QuickAddModalProps {
  isOpen: boolean;
  initialDate?: string;
  editItem?: DealItem | null;
  quickTags: string[];
  currentYear: number;
  currentMonth: number;
  onClose: () => void;
  onSave: (item: DealItem) => void;
  onDelete?: (id: string) => void;
  onAddTag: (tag: string) => void;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({
  isOpen,
  initialDate,
  editItem,
  quickTags,
  currentYear,
  currentMonth,
  onClose,
  onSave,
  onDelete,
  onAddTag
}) => {
  const [quickText, setQuickText] = useState('');
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [finalPrice, setFinalPrice] = useState<string>('');
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [dealTag, setDealTag] = useState('기타');
  const [memo, setMemo] = useState('');
  const [isNewTagInputOpen, setIsNewTagInputOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const quickInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setDate(editItem.date);
        setTitle(editItem.title);
        setFinalPrice(editItem.finalPrice ? String(editItem.finalPrice) : '');
        setDiscountAmount(editItem.discountAmount ? String(editItem.discountAmount) : '');
        setDealTag(editItem.dealTag || '기타');
        setMemo(editItem.memo || '');
        setQuickText('');
      } else {
        const defaultDate = initialDate || getTodayString();
        setDate(defaultDate);
        setTitle('');
        setFinalPrice('');
        setDiscountAmount('');
        setDealTag(quickTags[0] || '배민');
        setMemo('');
        setQuickText('');
        // Focus quick input automatically on mobile/desktop
        setTimeout(() => {
          quickInputRef.current?.focus();
        }, 150);
      }
      setIsNewTagInputOpen(false);
      setNewTagName('');
    }
  }, [isOpen, editItem, initialDate, quickTags]);

  if (!isOpen) return null;

  // 한 줄 퀵 텍스트 파싱 적용
  const handleApplyQuickText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickText.trim()) return;

    const parsed = parseQuickEntry(quickText, currentYear, currentMonth);
    if (parsed.date) setDate(parsed.date);
    if (parsed.title) setTitle(parsed.title);
    if (parsed.finalPrice > 0) setFinalPrice(String(parsed.finalPrice));
    if (parsed.discountAmount > 0) setDiscountAmount(String(parsed.discountAmount));
    if (parsed.dealTag) setDealTag(parsed.dealTag);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 만약 한 줄 입력만 적고 바로 등록 버튼을 누른 경우 자동 파싱
    let finalTitle = title.trim();
    let finalPaid = parseInt(finalPrice.replace(/,/g, ''), 10) || 0;
    let finalDiscount = parseInt(discountAmount.replace(/,/g, ''), 10) || 0;
    let finalTargetDate = date || getTodayString();
    let finalSelectedTag = dealTag;

    if (!finalTitle && quickText.trim()) {
      const parsed = parseQuickEntry(quickText, currentYear, currentMonth);
      finalTitle = parsed.title;
      if (parsed.finalPrice > 0) finalPaid = parsed.finalPrice;
      if (parsed.discountAmount > 0) finalDiscount = parsed.discountAmount;
      if (parsed.date) finalTargetDate = parsed.date;
      if (parsed.dealTag) finalSelectedTag = parsed.dealTag;
    }

    if (!finalTitle) {
      finalTitle = '소비/혜택 플랜';
    }

    const item: DealItem = {
      id: editItem ? editItem.id : generateId(),
      date: finalTargetDate,
      title: finalTitle,
      finalPrice: finalPaid,
      discountAmount: finalDiscount,
      dealTag: finalSelectedTag,
      memo: memo.trim(),
      isCompleted: editItem ? editItem.isCompleted : false,
      createdAt: editItem ? editItem.createdAt : Date.now()
    };

    onSave(item);

    // 할인 혜택이 있을 때 경쾌한 폭죽 효과
    if (finalDiscount > 0) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.85 }
      });
    }

    onClose();
  };

  const handleAddNewTag = () => {
    const trimmed = newTagName.trim();
    if (trimmed && !quickTags.includes(trimmed)) {
      onAddTag(trimmed);
      setDealTag(trimmed);
      setNewTagName('');
      setIsNewTagInputOpen(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Bottom Sheet Container */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl z-10 max-h-[92vh] overflow-y-auto pb-safe">
        {/* Header bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">
              {editItem ? '플랜 수정하기' : '초간편 혜택 플랜 등록'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-3">
          {/* Quick One-Liner Box (when not editing) */}
          {!editItem && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-3">
              <div className="flex items-center justify-between text-xs text-indigo-300 font-medium mb-1.5">
                <span className="flex items-center gap-1">
                  ⚡ <strong>한 줄 자연어 빠른 입력</strong>
                </span>
                <span className="text-[11px] text-indigo-400/80">
                  대충 적어도 자동 인식
                </span>
              </div>
              <div className="flex gap-2">
                <input
                  ref={quickInputRef}
                  type="text"
                  value={quickText}
                  onChange={(e) => setQuickText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyQuickText();
                    }
                  }}
                  placeholder="예: 15일 와퍼 6000 요기요할인 3000"
                  className="flex-1 bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => handleApplyQuickText()}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shrink-0 active:scale-95 transition"
                >
                  <span>인식</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Date & Title row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> 날짜
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1">
                품목 / 먹을 것 / 살 것
              </label>
              <input
                ref={titleInputRef}
                type="text"
                required
                placeholder="예: 와퍼 주니어 1+1, 올영 샴푸"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Prices row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                결제 예정액 (내가 낼 돈)
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={finalPrice ? Number(finalPrice).toLocaleString() : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setFinalPrice(raw);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400">원</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-pink-400 mb-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> 할인/아낀 금액 (세이브)
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={discountAmount ? Number(discountAmount).toLocaleString() : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setDiscountAmount(raw);
                  }}
                  className="w-full bg-slate-800 border border-pink-500/40 rounded-xl px-3 py-2 text-sm font-semibold text-pink-400 placeholder-slate-500 focus:outline-none focus:border-pink-500"
                />
                <span className="absolute right-3 top-2.5 text-xs text-pink-400/80">원</span>
              </div>
            </div>
          </div>

          {/* Quick Tag Chips */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-2">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5" /> 행사 / 혜택 태그
              </span>
              <button
                type="button"
                onClick={() => setIsNewTagInputOpen(!isNewTagInputOpen)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-normal flex items-center gap-0.5"
              >
                <Plus className="w-3 h-3" /> 태그 추가
              </button>
            </div>

            {/* Tag add input inline */}
            {isNewTagInputOpen && (
              <div className="flex gap-1.5 mb-2">
                <input
                  type="text"
                  placeholder="새 행사 태그명"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleAddNewTag}
                  className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-medium"
                >
                  추가
                </button>
              </div>
            )}

            {/* Chips list */}
            <div className="flex flex-wrap gap-1.5">
              {quickTags.map((tag) => {
                const isSelected = dealTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setDealTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 flex items-center gap-1 ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Memo (optional) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              메모 (선택)
            </label>
            <input
              type="text"
              placeholder="예: 11번가 쿠폰 적용, 점심 대용"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            {editItem && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('이 플랜을 삭제하시겠습니까?')) {
                    onDelete(editItem.id);
                    onClose();
                  }
                }}
                className="px-4 py-3 bg-rose-950/40 border border-rose-800/60 text-rose-400 hover:bg-rose-900/50 rounded-xl text-sm font-semibold transition"
              >
                삭제
              </button>
            )}

            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-500/25 transition active:scale-[0.99] flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>{editItem ? '수정 완료' : '플랜 등록하기'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
