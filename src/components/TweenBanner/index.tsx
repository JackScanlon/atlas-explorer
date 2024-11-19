import './TweenBanner.css'

import AtlasLogoDark from '@assets/atlas-logo-dark.svg'
import AtlasLogoLight from '@assets/atlas-logo-light.svg'

import createTween from '@solid-primitives/tween'

import { CurrentTheme } from '../ThemeSwitch'
import { JSX, Component, onMount, Show, createSignal } from 'solid-js'
import { World } from '@/explorer/constants'

const TweenBanner: Component<{ }> = ({ }): JSX.Element => {
  const [tweenTarget, setTweenTarget] = createSignal<number>(1);
  const tweenAlpha = createTween(tweenTarget, {
    duration: World.SceneBannerTweenAnimation,
    ease: (x: number): number => Math.sqrt(1 - ((x - 1) * (x - 1))),
  });

  onMount(() => {
    setTimeout(() => setTweenTarget(0), World.ScenePointsTweenDelay);
  });

  return (
    <Show when={tweenAlpha() > 0}>
      <article class='spring-banner'>
        <img
          class='spring-banner__logo no-user-selection'
          src={CurrentTheme() === 'dark'? AtlasLogoDark : AtlasLogoLight}
          style={`width: ${tweenAlpha() * 50}%;`}
        />
      </article>
    </Show>
  )
};

export default TweenBanner;
