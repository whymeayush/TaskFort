import React from 'react';
import { History, User, CheckCircle2, ArrowRight, MessageSquare, ShieldAlert } from 'lucide-react';

export function ActivityTimeline({ events = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="py-4 text-center text-xs text-[#9CA3AF]">
        No recorded activity yet.
      </div>
    );
  }

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatSentence = (evt) => {
    const actor = evt.actorId?.name || evt.actor?.name || 'An operator';
    switch (evt.actionType) {
      case 'CREATED':
        return `${actor} created this work item.`;
      case 'ASSIGNED':
        return `${actor} claimed responsibility.`;
      case 'REASSIGNED':
        return `${actor} reassigned the item to ${evt.newValue || 'new owner'}.`;
      case 'STATUS_CHANGE':
        return `${actor} moved the item from ${evt.prevValue || 'status'} to ${evt.newValue}.`;
      case 'APPROVAL_REQUESTED':
        return `${actor} requested operational approval.`;
      case 'APPROVAL_GRANTED':
        return `${actor} approved the request.`;
      case 'APPROVAL_REJECTED':
        return `${actor} rejected the request.`;
      case 'COMMENT_ADDED':
        return `${actor} posted an update.`;
      default:
        return evt.comment || `${actor} updated ${evt.field || 'the record'}.`;
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-3">
      {events.map((evt, idx) => {
        const actor = evt.actorId?.name || evt.actor?.name || 'Operator';

        return (
          <div key={evt._id || idx} className="flex items-start gap-2.5 text-xs">
            <div className="w-5 h-5 rounded-full bg-[#EEF1FD] text-[#4F5FE8] flex items-center justify-center font-bold text-[9px] shrink-0 mt-0.5">
              {getInitials(actor)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[#20242C] leading-snug">
                {formatSentence(evt)}
              </p>
              {evt.comment && evt.actionType !== 'COMMENT_ADDED' && (
                <p className="text-[11px] text-[#727987] italic mt-0.5">"{evt.comment}"</p>
              )}
              <time className="text-[10px] text-[#9CA3AF] font-mono mt-0.5 block">
                {formatTime(evt.timestamp || evt.createdAt)}
              </time>
            </div>
          </div>
        );
      })}
    </div>
  );
}
