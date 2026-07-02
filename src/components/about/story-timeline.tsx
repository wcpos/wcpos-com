'use client'

import * as React from 'react'
import { motion, useScroll, useTransform } from 'motion/react'
import { Section, Container } from '@/components/ui/section'
import { SectionHeading } from '@/components/ui/section-heading'

const milestones = [
  {
    date: 'December 2011',
    title: 'Urban Locavore opens',
    body: 'A small food store in Perth, with hundreds of products already in WooCommerce — and no way to sell them at the counter.',
  },
  {
    date: '2011 – 2014',
    title: 'A register, built out of necessity',
    body: 'With nothing on the market that fit, Paul built a point of sale for his own shop, on top of the store he already ran online.',
  },
  {
    date: 'April 2014',
    title: 'The shop closes',
    body: 'Urban Locavore winds down — but the register it ran on still works, and other WooCommerce stores need the same thing.',
  },
  {
    date: '11 May 2014',
    title: 'Released on WordPress.org',
    body: 'WCPOS goes public, free for anyone who needs it. The free version does the actual job: sell, print, stay in sync.',
  },
  {
    date: 'Today',
    title: 'Still shipping',
    body: 'More than a decade on. One developer, funded by Pro, still releasing — and the free version is still the real thing.',
  },
]

function usePrefersReducedMotion() {
  return React.useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const mql = window.matchMedia('(prefers-reduced-motion: reduce)')
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () =>
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false
  )
}

function Milestone({
  date,
  title,
  body,
  animate,
}: (typeof milestones)[number] & { animate: boolean }) {
  const content = (
    <>
      <motion.span
        aria-hidden="true"
        className="absolute -left-[31px] mt-1.5 h-3 w-3 rounded-full bg-wcpos-red"
        initial={animate ? { scale: 0.4, opacity: 0.4 } : false}
        whileInView={animate ? { scale: 1, opacity: 1 } : undefined}
        viewport={{ once: true, margin: '-20% 0px -20% 0px' }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      />
      <p className="text-sm font-medium text-wcpos-red">{date}</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-400">
        {body}
      </p>
    </>
  )

  if (!animate) {
    return <li className="relative mb-10 ml-6 last:mb-0">{content}</li>
  }
  return (
    <motion.li
      className="relative mb-10 ml-6 last:mb-0"
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-12% 0px -12% 0px' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {content}
    </motion.li>
  )
}

/**
 * The company timeline, drawn by scroll (ADR 0013: movement that means
 * progress). A gradient fill grows down the line track as the reader moves
 * through the story, a glowing tip rides its end, and each milestone lifts
 * in as the line reaches it. Reduced motion renders the static timeline.
 */
export function StoryTimeline() {
  const listRef = React.useRef<HTMLOListElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const { scrollYProgress } = useScroll({
    target: listRef,
    offset: ['start 0.78', 'end 0.6'],
  })
  const tipTop = useTransform(scrollYProgress, (v) => `${v * 100}%`)

  return (
    <Section tone="default" spacing="default" bare>
      <Container width="prose">
        <SectionHeading
          className="mb-12"
          title="How it started, and why it's still here"
        />

        <ol ref={listRef} className="relative">
          {/* line track + scroll-drawn fill + traveling tip */}
          <span
            aria-hidden="true"
            className="absolute bottom-1 left-0 top-1 w-0.5 rounded bg-slate-200 dark:bg-slate-800"
          />
          {!reducedMotion && (
            <>
              <motion.span
                aria-hidden="true"
                className="absolute bottom-1 left-0 top-1 w-0.5 origin-top rounded bg-gradient-to-b from-wcpos-red via-[#5b8def] to-[#8b5cf6]"
                style={{ scaleY: scrollYProgress }}
              />
              <motion.span
                aria-hidden="true"
                className="absolute -left-[3px] h-2 w-2 rounded-full bg-[#5b8def] shadow-[0_0_10px_2px_rgba(91,141,239,0.55)]"
                style={{ top: tipTop }}
              />
            </>
          )}
          {milestones.map((m) => (
            <Milestone key={m.date} {...m} animate={!reducedMotion} />
          ))}
        </ol>
      </Container>
    </Section>
  )
}
