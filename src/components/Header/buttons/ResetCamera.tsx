import '../Header.css'

import { BsCamera } from 'solid-icons/bs'
import { Component } from 'solid-js'

export const ResetCamera: Component<{ onClick?: () => void }> = ({ onClick }) => {
  return (
    <button class='icon-button' onClick={onClick}>
      <BsCamera title='Reset Camera' size={'24px'} />
    </button>
  )
};
