import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Plus, Calendar, Tag, Check, ArrowRight, CreditCard, Coins, ShoppingBag } from 'lucide-react';
import confetti from 'canvas-confetti';
import { DealItem, BenefitType } from '../types';
import { generateId, getTodayString, formatKRW } from '../utils/formatters';
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
  onDeleteTag?: (tag: string) => void;
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
  onAddTag,
  onDeleteTag
}) => {
  const [quickText, setQuickText] = useState('');
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [finalPrice, setFinalPrice] = useState<string>('');
  const [benefitType, setBenefitType] = useState<BenefitType>('instant');
  const [benefitAmount, setBenefitAmount] = useState<string>('');
  const [dealTag, setDealTag] = useState('');
  const [memo, setMemo] = useState('');
  const [isTagManageMode, setIsTagManageMode] = useState(false);

  const quickInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (editItem) {
        setDate(editItem.date);
        setTitle(editItem.title);
        setFinalPrice(editItem.finalPrice ? String(editItem.finalPrice) : '');
        setBenefitType(editItem.benefitType || 'instant');
        setBenefitAmount(editItem.benefitAmount ? String(editItem.benefitAmount) : '');
        setDealTag(editItem.dealTag || '');
        setMemo(editItem.memo || '');
        setQuickText('');
      } else {
        const defaultDate = initialDate || getTodayString();
        setDate(defaultDate);
        setTitle('');
        setFinalPrice('');
        setBenefitType('instant');
        setBenefitAmount('');
        setDealTag('');
        setMemo('');
        setQuickText('');
        // Focus quick input automatically on mobile/desktop
        setTimeout(() => {
          quickInputRef.current?.focus();
        }, 150);
      }
      setIsTagManageMode(false);
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
    setBenefitType(parsed.benefitType);
    if (parsed.benefitAmount > 0) {
      setBenefitAmount(String(parsed.benefitAmount));
    } else {
      setBenefitAmount('');
    }
    if (parsed.dealTag) setDealTag(parsed.dealTag);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 만약 한 줄 입력만 적고 바로 등록 버튼을 누른 경우 자동 파싱
    let finalTitle = title.trim();
    let finalPaid = parseInt(finalPrice.replace(/,/g, ''), 10) || 0;
    let finalType: BenefitType = benefitType;
    let finalBenefit = parseInt(benefitAmount.replace(/,/g, ''), 10) || 0;
    let finalTargetDate = date || getTodayString();
    let finalSelectedTag = dealTag;

    if (!finalTitle && quickText.trim()) {
      const parsed = parseQuickEntry(quickText, currentYear, currentMonth);
      finalTitle = parsed.title;
      if (parsed.finalPrice > 0) finalPaid = parsed.finalPrice;
      finalType = parsed.benefitType;
      if (parsed.benefitAmount > 0) finalBenefit = parsed.benefitAmount;
      if (parsed.date) finalTargetDate = parsed.date;
      if (parsed.dealTag) finalSelectedTag = parsed.dealTag;
    }

    if (!finalTitle) {
      finalTitle = '소비/혜택 플랜';
    }

    if (finalType === 'instant') {
      finalBenefit = 0;
    }

    const trimmedTag = (finalSelectedTag || '').trim();

    // 직접 입력한 새 태그는 quickTags에 자동으로 등록하여 다음번 원터치 재사용 지원
    if (trimmedTag && !quickTags.includes(trimmedTag)) {
      onAddTag(trimmedTag);
    }

    const item: DealItem = {
      id: editItem ? editItem.id : generateId(),
      date: finalTargetDate,
      title: finalTitle,
      finalPrice: finalPaid,
      benefitType: finalType,
      benefitAmount: finalBenefit,
      dealTag: trimmedTag,
      memo: memo.trim(),
      isCompleted: editItem ? editItem.isCompleted : false,
      createdAt: editItem ? editItem.createdAt : Date.now()
    };

    onSave(item);

    // 사후 혜택이 있을 때 경쾌한 폭죽 효과
    if (finalBenefit > 0) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.85 }
      });
    }

    onClose();
  };

  const parsedPaid = parseInt(finalPrice.replace(/,/g, ''), 10) || 0;
  const parsedBenefit = parseInt(benefitAmount.replace(/,/g, ''), 10) || 0;
  const netSpend = Math.max(0, parsedPaid - parsedBenefit);

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

          {/* Title row */}
          <div>
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
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Date row with full width & quick shortcuts */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-1">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" /> 날짜
              </span>
              <div className="flex items-center gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => setDate(getTodayString())}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                >
                  오늘
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    const y = d.getFullYear();
                    const m = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    setDate(`${y}-${m}-${day}`);
                  }}
                  className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                >
                  내일
                </button>
              </div>
            </div>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Checkout (finalPrice) Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              실제 결제(승인) 금액 <span className="text-[11px] text-slate-400">(원 단위)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="예: 12,000"
                value={finalPrice ? Number(finalPrice).toLocaleString() : ''}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '');
                  setFinalPrice(raw);
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-base font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <span className="absolute right-3.5 top-3 text-xs font-semibold text-slate-400">원</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 pl-1">
              카드 결제창 또는 매장에서 긁을 최종 결제 금액입니다.
            </p>
          </div>

          {/* Benefit Type Selection (3 Modes) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              할인 및 혜택 유형
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {/* Instant discount */}
              <button
                type="button"
                onClick={() => setBenefitType('instant')}
                className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 border transition active:scale-95 ${
                  benefitType === 'instant'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span className="text-center text-xs whitespace-nowrap">즉시할인</span>
              </button>

              {/* Bill discount (삼성LINK, 청구할인 등) */}
              <button
                type="button"
                onClick={() => setBenefitType('bill_discount')}
                className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 border transition active:scale-95 ${
                  benefitType === 'bill_discount'
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span className="text-center text-xs whitespace-nowrap">청구할인</span>
              </button>

              {/* Point reward (Tday 적립, 캐시백 등) */}
              <button
                type="button"
                onClick={() => setBenefitType('point_reward')}
                className={`p-2 rounded-xl text-xs font-semibold flex flex-col items-center justify-center gap-1 border transition active:scale-95 ${
                  benefitType === 'point_reward'
                    ? 'bg-pink-600 text-white border-pink-500 shadow-md shadow-pink-600/30'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
              >
                <Coins className="w-4 h-4 shrink-0" />
                <span className="text-center text-xs whitespace-nowrap">포인트적립</span>
              </button>
            </div>
          </div>

          {/* Conditional Benefit Amount Input (for bill_discount or point_reward) */}
          {benefitType !== 'instant' && (
            <div className="space-y-2 bg-slate-800/50 p-3 rounded-2xl border border-slate-700/80">
              <label className="block text-xs font-semibold text-white flex items-center gap-1 whitespace-nowrap">
                {benefitType === 'bill_discount' ? (
                  <>
                    <CreditCard className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>결제일 청구할인액 (원 단위)</span>
                  </>
                ) : (
                  <>
                    <Coins className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <span>적립 금액 (원 단위)</span>
                  </>
                )}
              </label>

              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="예: 2,000 또는 24,000"
                  value={benefitAmount ? Number(benefitAmount).toLocaleString() : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setBenefitAmount(raw);
                  }}
                  className={`w-full bg-slate-900 border rounded-xl px-3.5 py-2.5 text-sm font-bold placeholder-slate-500 focus:outline-none ${
                    benefitType === 'bill_discount'
                      ? 'border-emerald-500/50 text-emerald-300 focus:border-emerald-400'
                      : 'border-pink-500/50 text-pink-300 focus:border-pink-400'
                  }`}
                />
                <span className="absolute right-3.5 top-3 text-xs text-slate-400">원</span>
              </div>

              {/* Dynamic Feedback Banner */}
              {parsedBenefit > 0 && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex flex-col gap-1 border ${
                    benefitType === 'bill_discount'
                      ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                      : 'bg-pink-950/40 border-pink-500/30 text-pink-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold whitespace-nowrap">
                    <span>✨ 예산 확대 효과:</span>
                    <span>+{formatKRW(parsedBenefit)}</span>
                  </div>
                  <div className="text-[11px] text-slate-300 whitespace-nowrap truncate">
                    결제 {formatKRW(parsedPaid)} · 실질 순지출{' '}
                    <strong className="text-white underline">{formatKRW(netSpend)}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tag Input & Quick Chips */}
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-300 mb-1.5">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-indigo-400" />
                행사 / 혜택 태그
              </span>
              <span className="text-[11px] text-slate-400">
                직접 입력하거나 아래 칩 선택
              </span>
            </div>

            {/* Direct Editable Tag Input */}
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="예: 삼성LINK, T-day, 배민, 스타벅스 등 직접 입력"
                value={dealTag}
                onChange={(e) => setDealTag(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
              />
              {dealTag && (
                <button
                  type="button"
                  onClick={() => setDealTag('')}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 p-0.5"
                  title="태그 지우기"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Chips list */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-slate-400 font-medium">
                  자주 쓰는 태그
                </span>
                {quickTags.length > 0 && onDeleteTag && (
                  <button
                    type="button"
                    onClick={() => setIsTagManageMode(!isTagManageMode)}
                    className={`text-[10px] px-2 py-0.5 rounded-md transition font-medium ${
                      isTagManageMode
                        ? 'bg-rose-950/70 text-rose-300 border border-rose-800/60 font-bold'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-800/80 border border-slate-700/60'
                    }`}
                  >
                    {isTagManageMode ? '편집 완료' : '태그 삭제/정리'}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {quickTags.map((tag) => {
                  const isSelected = dealTag.trim().toLowerCase() === tag.toLowerCase();
                  return (
                    <div
                      key={tag}
                      className={`inline-flex items-center rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setDealTag(tag)}
                        className="px-2.5 py-1 flex items-center gap-1 active:scale-95 transition"
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{tag}</span>
                      </button>

                      {isTagManageMode && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (dealTag === tag) setDealTag('');
                            onDeleteTag?.(tag);
                          }}
                          className="pr-2 pl-0.5 py-1 text-slate-400 hover:text-rose-400 active:scale-90 transition"
                          title={`${tag} 삭제`}
                          aria-label={`${tag} 삭제`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
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
