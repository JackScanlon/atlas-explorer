import './TweenBanner.css'

import AtlasLogoDark from '@assets/atlas-logo-dark.svg'
import AtlasLogoLight from '@assets/atlas-logo-light.svg'

import Spring from '@/explorer/common/spring'

import { CurrentTheme } from '../ThemeSwitch'
import { JSX, Component, createEffect, Show, createSignal } from 'solid-js'
import { World } from '@/explorer/constants'

const TweenBanner: Component<{ }> = ({ }): JSX.Element => {
  const [springAlpha, setSpringAlpha] = createSignal<number>(100);

  createEffect(() => {
    setTimeout(() => {
      const spr = new Spring({ Target: 100, Speed: 1, Damper: 0.75, Timer: () => performance.now()*1e-4 });

      const update = (): void => {
        if (spr.target > 0.5) {
          spr.target = 0;
        }

        const frame = spr.Update();
        if (!frame.Animating) {
          return;
        }

        setSpringAlpha(frame.Position / 100);
        requestAnimationFrame(update);
      };
      requestAnimationFrame(update);

    }, World.ScenePointsTweenDelay);
  });

  return (
    <Show when={springAlpha() > 0}>
      <article class='spring-banner'>
        <img
          class='spring-banner__logo no-user-selection'
          src={CurrentTheme() === 'dark'? AtlasLogoDark : AtlasLogoLight}
          style={`width: ${springAlpha() * 50}%;`}
        />
      </article>
    </Show>
  )
};

export default TweenBanner;
