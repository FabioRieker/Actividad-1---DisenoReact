import { Animation, AnimationBuilder, createAnimation } from '@ionic/react';
import { prefersReducedMotion } from '../hooks/useMotion';

interface PageTransitionOptions {
  enteringEl: HTMLElement;
  leavingEl?: HTMLElement;
  direction?: 'forward' | 'back';
}

/**
 * Transición entre páginas: la nueva vista entra como una cortinilla (clip-path)
 * mientras la anterior se desplaza y se apaga.
 */
export const pageTransition: AnimationBuilder = (_baseEl: HTMLElement, opts?: unknown): Animation => {
  const { enteringEl, leavingEl, direction } = opts as PageTransitionOptions;
  const back = direction === 'back';

  const enter = createAnimation()
    .addElement(enteringEl)
    .beforeRemoveClass('ion-page-invisible')
    .beforeStyles({ 'z-index': '101' })
    .afterClearStyles(['z-index', 'clip-path', 'transform'])
    .fromTo('clip-path', back ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)', 'inset(0 0% 0 0%)')
    .fromTo('transform', 'scale(1.03)', 'scale(1)');

  const root = createAnimation()
    .duration(prefersReducedMotion() ? 0 : 560)
    .easing('cubic-bezier(0.77, 0, 0.18, 1)')
    .addAnimation(enter);

  if (leavingEl) {
    root.addAnimation(
      createAnimation()
        .addElement(leavingEl)
        .afterClearStyles(['opacity', 'transform'])
        .fromTo('opacity', '1', '0.35')
        .fromTo('transform', 'translateX(0)', back ? 'translateX(10%)' : 'translateX(-10%)')
    );
  }
  return root;
};

/** Modal: cae desde arriba con rebote y ligera rotación */
export const modalEnter = (baseEl: HTMLElement): Animation => {
  const root = baseEl.shadowRoot;
  const backdrop = createAnimation()
    .addElement(root?.querySelector('ion-backdrop') ?? baseEl)
    .fromTo('opacity', '0.01', 'var(--backdrop-opacity)');
  const wrapper = createAnimation()
    .addElement(root?.querySelector('.modal-wrapper') ?? baseEl)
    .keyframes([
      { offset: 0, opacity: '0', transform: 'translateY(-80px) rotate(-3deg) scale(0.96)' },
      { offset: 0.6, opacity: '1', transform: 'translateY(10px) rotate(0.8deg) scale(1)' },
      { offset: 1, opacity: '1', transform: 'translateY(0) rotate(0) scale(1)' },
    ]);
  return createAnimation()
    .addElement(baseEl)
    .duration(prefersReducedMotion() ? 0 : 520)
    .easing('cubic-bezier(0.2, 0.9, 0.25, 1)')
    .addAnimation([backdrop, wrapper]);
};

export const modalLeave = (baseEl: HTMLElement): Animation =>
  modalEnter(baseEl).direction('reverse').duration(prefersReducedMotion() ? 0 : 260);
