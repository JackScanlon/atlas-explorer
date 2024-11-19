/* @refresh reload */
import '@/index.css'

import { App } from '@/App'
import { render } from 'solid-js/web'

const root = document.getElementById('root') as HTMLElement;
render(() => <App root={root} />, root);
