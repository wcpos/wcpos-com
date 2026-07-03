/**
 * A photoreal hardware cutout (AVIF + WebP with alpha, contact shadow baked
 * in) scaled to fit its category's fixed stage box. The drawn size is
 * computed here (contain-fit) rather than via CSS max-* chains, so the
 * wrapper's box exactly equals the drawn image and the screen overlay can be
 * positioned with plain percentages of the source-image rect.
 *
 * `screen` is the device display's rect in source-image pixels (measured off
 * the render, same approach as the Act-1 counter photo pin); children are
 * overlaid there — the renders ship with screens off so the DOM supplies
 * live, crisp screen content.
 */
export type ScreenRect = {
  left: number
  top: number
  width: number
  height: number
}

export function HardwareImage({
  name,
  width,
  height,
  boxWidth,
  boxHeight,
  screen,
  children,
}: {
  /** file basename under /images/story/hardware, e.g. "terminal-1" */
  name: string
  /** source image intrinsic size, px */
  width: number
  height: number
  /** category stage box the image is contain-fitted into, px */
  boxWidth: number
  boxHeight: number
  /** display rect in source-image px; children render there */
  screen?: ScreenRect
  children?: React.ReactNode
}) {
  const scale = Math.min(boxWidth / width, boxHeight / height)
  const pct = (v: number, total: number) => `${(v / total) * 100}%`
  return (
    <div
      className="relative"
      style={{ width: width * scale, height: height * scale }}
    >
      <picture>
        <source
          srcSet={`/images/story/hardware/${name}.avif`}
          type="image/avif"
        />
        <img
          src={`/images/story/hardware/${name}.webp`}
          alt=""
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full select-none"
        />
      </picture>
      {screen && children && (
        <div
          className="absolute flex flex-col items-center justify-center text-center"
          style={{
            left: pct(screen.left, width),
            top: pct(screen.top, height),
            width: pct(screen.width, width),
            height: pct(screen.height, height),
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
