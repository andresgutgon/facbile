import fetchAdapter from 'mobx-rest-fetch-adapter'
import temporalFetchAdapter from './temporalFetchAdapter'
import { apiClient } from 'mobx-rest'
import { apiUrl } from 'config/Vars'

export default () => {
  apiClient(fetchAdapter, {
    apiPath: apiUrl,
    commonOptions: {}
  })
}
