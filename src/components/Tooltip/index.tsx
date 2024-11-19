import { AtlasTooltipTarget } from '@/explorer/types';
import './Tooltip.css'

import { Accessor, batch, Component, createEffect, createSignal, JSX } from 'solid-js'
import { clampValue } from '@/explorer/common/utils';

const Tooltip: Component<{ target: Accessor<AtlasTooltipTarget | null> }> = ({ target }): JSX.Element => {
  let tip: HTMLDivElement | undefined;

  const [style, setStyle] = createSignal<string>('');
  const [active, setActive] = createSignal<boolean>(false);

  const computePosition = async (): Promise<string> => {
    const obj = target();
    if (!obj) {
      return setStyle('');
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        const { innerWidth, innerHeight } = window;
        const { width, height } = tip ? tip.getBoundingClientRect() : { height: 0, width: 0 };

        let { x, y } = obj.Position;
        x = clampValue(x -  width*0.5, 0, innerWidth  - width);
        y = clampValue(y + height*0.5, 0, innerHeight - height)

        resolve(`left: ${x}px; top: ${y}px;`)
      }, 10)
    })
      .then(setStyle);
  }

  createEffect(() => batch(async () => {
    setActive(!!target());
    await computePosition();
  }), [target]);

  return (
    <>
      <div
        ref={tip}
        classList={{ 'tooltip': true, 'tooltip--active': active(), 'no-user-selection': true }}
        style={style()}
      >
        {
          target()
            ? <>
              <div class='tooltip__grid'>
                <h4>{target()!.Selection.Record.Name}</h4>
              </div>
              <div class='tooltip__grid'>
                <p><strong>Age</strong></p>
                <p><strong>Freq</strong></p>
                <p><strong>SMR</strong></p>
                <p>{target()?.Selection.Record.Age}</p>
                <p>{target()?.Selection.Record.Frequency}</p>
                <p>{target()?.Selection.Record.Mortality}</p>
              </div>
            </>
            : <></>
        }
      </div>
    </>
  )
}

export default Tooltip;
