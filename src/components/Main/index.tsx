import React from 'react'
import { StyleSheet, Text, View, Button, Linking, AsyncStorage } from 'react-native'
import { apiClient } from 'mobx-rest'
import randomString from 'random-string'
import Hashes from 'jshashes'
import qs from 'qs'
import URL from 'url-parse'

import { apiUrl, factorialAuth } from 'config/Vars'

function sha256base64urlencode(codeVerifier) {
  // https://tools.ietf.org/html/rfc7636#appendix-A
  // https://tools.ietf.org/html/rfc4648#section-5
  return new Hashes
    .SHA256()
    .b64(codeVerifier)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+/g, '')
}

export default class App extends React.Component {
  state = { user: null }

  constructor (props) {
    super(props)

    this.api = new apiClient()
    this.handleOpenUrl = this.handleRedirectUri
  }

  componentDidMount () {
    console.log('HERE: App.componentDidMount')

    Linking.addEventListener('url', this.handleOpenUrl)
    Linking.getInitialURL()
      .then(url => {
        if (url) this.handleRedirectUri(url)
      })
  }

  componentWillUnmount() {
    Linking.removeEventListener('url', this.handleOpenUrl)
  }

  handleRedirectUri (urlString) {
    const url = new URL(urlString, true)
    const { code, state } = url.query

    console.log('HERE: App.beforeHandleRedirectUri')

    if (!code) return

    const {
      clientId,
      redirectUri,
      grantType,
      tokenEndpoint,
      scope,
      codeChallengeMethod
    } = factorialAuth

    console.log('HERE: handleRedirectUri')

    Promise.all([
      AsyncStorage.getItem('state'),
      AsyncStorage.getItem('code_verifier')
    ]).then(([ requestState, requestCodeVerifier ]) => {
      AsyncStorage.removeItem('state')
      AsyncStorage.removeItem('code_verifier')

      if (state != requestState) {
        console.log(
          'State mismatch, don not carry out the token request',
          state,
          requestState
        )
        return
      }

      const codeVerifier = requestCodeVerifier || undefined

      const payload = {
        code,
        codeVerifier,
        client_id: clientId,
        redirect_uri: redirectUri,
        grant_type: grantType
      }

      const { promise } = this.api.post(
        tokenEndpoint,
        qs.stringify(payload),
        {
          headers: {
            'Content-type': 'application/x-www-form-urlencoded'
          }
        }
      )

      promise
        .then(resp => resp.json())
        .then(user => this.setState({ user }))
        .catch(err => {
          console.warn('something went wrong', err)
        })
    })
  }

  render() {
    const { user } = this.state

    console.log('HERE: App.render')

    if (!user) {
      return (
        <View style={styles.container}><LoginView /></View>
      )
    }

    return (
      <View style={styles.container}>
        <Text>Welcome {user.email}</Text>
      </View>
    )
  }
}

class LoginView extends React.Component {
  constructor (props) {
    super(props)
    this.onLogin = this.handleLogin
  }

  handleLogin = () => {
    const {
      clientId,
      redirectUri,
      authEndpoint,
      responseType,
      scope,
      codeChallengeMethod
    } = factorialAuth

    // PKCE - https://tools.ietf.org/html/rfc7636
    //  - Protect against other apps who register our application url scheme
    const codeVerifier = randomString({ length: 45 })
    const codeChallenge = sha256base64urlencode(codeVerifier)

    // Protect against rogue web pages that try redirect the user to authorize (XSRF)
    const state = randomString()

    const params = {
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: responseType,
      scope,
      state,
      code_challenge_method: codeChallengeMethod,
      code_challenge: codeChallenge
    }
    const authorizationUrl = `${apiUrl}${authEndpoint}?${qs.stringify(params)}`

    Promise.all([
      AsyncStorage.setItem('code_verifier', codeVerifier),
      AsyncStorage.setItem('state', state)
    ]).then(() => {
      console.log(authorizationUrl)
      Linking.openURL(authorizationUrl)
    }).catch(err => {
      console.warn(err)
    })
  }

  render() {
    return (
      <View>
        <Button title='Log in' onPress={this.onLogin} />
      </View>
    )
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
