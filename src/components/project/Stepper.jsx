import React, { Fragment } from 'react';
import { Check } from 'lucide-react';

/**
 * Horizontal stepper. Click previous steps to jump back; future
 * steps are locked.
 */
export default function Stepper({ steps, current, onJump }) {
  const getState = (i) => {
    if (i < current) return 'completed';
    if (i === current) return 'active';
    return 'upcoming';
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <ol className="flex items-start justify-between m-0 p-0 relative">
        {steps.map((step, i) => {
          const state = getState(i);
          const isLast = i === steps.length - 1;
          return (
            <Fragment key={step.id}>
              <li className="flex flex-col items-center relative" style={{ flex: '0 0 auto' }}>
                <button
                  type="button"
                  disabled={state === 'upcoming'}
                  onClick={() => state !== 'upcoming' && onJump?.(i)}
                  className="relative z-10 flex items-center justify-center transition-all"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: state === 'upcoming' ? 'default' : 'pointer',
                    background:
                      state === 'completed'
                        ? '#136d4a'
                        : state === 'active'
                        ? '#2c2f7c'
                        : 'white',
                    color:
                      state === 'upcoming' ? '#7a7a8c' : 'white',
                    border:
                      state === 'upcoming'
                        ? '1.5px solid #e5e3dc'
                        : state === 'active'
                        ? '1.5px solid #2c2f7c'
                        : '1.5px solid #136d4a',
                    boxShadow:
                      state === 'active'
                        ? '0 0 0 4px rgba(44,47,124,0.12)'
                        : 'none',
                  }}
                >
                  {state === 'completed' ? (
                    <Check size={18} strokeWidth={2.6} />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </button>

                <div
                  className="mt-3 text-center hidden sm:block"
                  style={{ width: 140 }}
                >
                  <div
                    className="font-semibold transition-colors"
                    style={{
                      fontSize: 13,
                      color:
                        state === 'upcoming'
                          ? '#7a7a8c'
                          : state === 'active'
                          ? '#2c2f7c'
                          : '#0d5538',
                    }}
                  >
                    {step.label}
                  </div>
                  <div
                    className="mt-0.5"
                    style={{
                      fontSize: 11.5,
                      color: state === 'upcoming' ? '#b5b5c2' : '#7a7a8c',
                      lineHeight: 1.5,
                    }}
                  >
                    {step.description}
                  </div>
                </div>
              </li>

              {!isLast && (
                <li
                  className="flex-1 mx-2 mt-5"
                  style={{
                    height: 2,
                    background:
                      i < current ? '#136d4a' : '#e5e3dc',
                    transition: 'background 0.3s ease',
                    borderRadius: 1,
                  }}
                  aria-hidden
                />
              )}
            </Fragment>
          );
        })}
      </ol>

      {/* Mobile-only label for current step */}
      <div className="sm:hidden text-center mt-4">
        <div className="font-semibold text-primary" style={{ fontSize: 13.5 }}>
          {steps[current].label}
        </div>
        <div className="text-muted mt-0.5" style={{ fontSize: 12 }}>
          {steps[current].description}
        </div>
      </div>
    </div>
  );
}
