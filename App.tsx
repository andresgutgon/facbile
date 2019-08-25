import React from 'react'

import initializers from 'initializers'
import Main from 'components/Main'

// Initializers
Object.keys(initializers).forEach((key) => initializers[key]())

const App = () => (<Main />)

export default App
