import './Footer.css'

import { JSX, Component } from 'solid-js'

const Footer: Component<{ }> = ({ }): JSX.Element => {
  return (
    <>
      <footer class='app-footer'>
        <div class='container'>
          <p class='version-info no-user-selection'>v{APP_VERSION}</p>
        </div>
      </footer>
    </>
  )
}

export default Footer;
