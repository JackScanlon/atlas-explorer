import './ThemeSwitch.css'

import { BsLightbulb, BsLightbulbOff } from 'solid-icons/bs'
import { Component, createEffect, createSignal, JSX } from 'solid-js'

export type ThemeCallback = (theme: string) => any | undefined;

export const [CurrentTheme, SetTheme] = createSignal<string>('');

export const ThemeSwitch: Component<{ onChange?: ThemeCallback | undefined }> = ({ onChange }): JSX.Element => {
  const toggleTheme = () => SetTheme(theme => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    if (typeof onChange !== 'undefined') {
      onChange(newTheme);
    }

    return newTheme;
  });

  const systemThemeDark = window.matchMedia('(prefers-color-scheme: dark)');
  createEffect(_ => {
    if (!CurrentTheme().length) {
      SetTheme(systemThemeDark.matches ? 'dark' : 'light');
    }

    document.documentElement.style.setProperty('color-scheme', CurrentTheme());
    document.documentElement.setAttribute('data-theme', CurrentTheme());
  });

  return (
    <button class='theme-switch' onClick={toggleTheme}>
      {
        CurrentTheme() == 'dark'
          ? <BsLightbulbOff title='Toggle Light mode' size={'24px'} />
          : <BsLightbulb    title='Toggle Dark mode'  size={'24px'} />
      }
    </button>
  )
};
