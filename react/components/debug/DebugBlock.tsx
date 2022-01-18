import React from 'react'

const DebugBlock: React.FC = ({ children }) => {
  return (
    <div className="shadow-2 w-34 bg-base pa5 fixed bottom-0 z-999 mb5 mr5 right-0">
      <div className="flex flex-column">{children}</div>
    </div>
  )
}

export default DebugBlock
