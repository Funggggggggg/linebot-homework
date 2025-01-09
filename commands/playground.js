/* 整體流程：
    1. 請求遠端 API。(axios)
    2. 處理地點資料（加緯度/經度、計算距離、填充模板）。(distance)
    3. 使用 LINE 的 Flex Message 格式回覆。(template)
    4. 在 Debug 模式下保存 Flex Message 的 JSON 結構到檔案中。(fs)
*/

// axios 用來發送 HTTP 請求的套件，從遠端 API 獲取資料。。
import axios from 'axios'
// fs 是 Node.js 的核心模組，用於在 Debug 模式下保存處理後的地點資料，方便調試和驗證結果。
import fs from 'node:fs'
import { distance } from '../utils/distance.js'
import template from '../templates/playground.js'

// 編排資料
export default async event => {
  try {
    // 測試
    // console.log('完整事件資料：', JSON.stringify(event, null, 2))
    // if (event.message.type !== 'location') {
    //   console.log('收到的不是地點訊息。')
    //   return
    // }
    // console.log('用戶的地點資訊：')
    // console.log('Latitude:', event.message.latitude)
    // console.log('Longitude:', event.message.longitude)

    const { data } = await axios.get('https://iplay.sa.gov.tw/odata/GymSearch?$format=application/json;odata.metadata=none&City=%E6%96%B0%E5%8C%97%E5%B8%82&GymType=%E7%94%B0%E5%BE%91%E5%A0%B4&Latitude=22.6239746&Longitude=120.305267')

    // 測試
    // console.log('API 回傳資料：', JSON.stringify(data, null, 2))
    // if (!Array.isArray(data.value)) {
    //   throw new Error('API 回應不是預期的陣列格式')
    // }

    // 確保 data.value 是陣列
    // if (!Array.isArray(data.value)) {
    //   throw new Error('API 回應不是預期的陣列格式')
    // }

    const updatedPlaces = data.value
      // 篩選確實擁有經緯度資料 (LatLng 屬性) 的地點 => 目的是避免沒有地理位置資訊的資料，因而無法正常顯示或使用
      .filter(item => item.LatLng)
      .map(item => {
        // 拆分 LatLng 並添加新的屬性
        const [latitude, longitude] = item.LatLng.split(',').map(parseFloat)
        return {
          ...item,
          Latitude: latitude,
          Longitude: longitude
        }
      })
      // map 迴圈陣列，每個東西都執行提供的 function，並將每個 return 值變成新的陣列
      .map(place => {
        place.distance = distance(place.Latitude, place.Longitude, event.message.latitude, event.message.longitude, 'K')
        return place
      })// 依照距離排序
      .sort((a, b) => {
        // console.log(a.distance, b.distance)
        return a.distance - b.distance
      })
      .slice(0, 3) // 從 0 開始取前三筆資料
      // 每一本資料套上 template()模板 加入結果
      .map(place => {
        const t = template()
        t.hero.url = place.Photo1 || 'https://http.cat/images/404.jpg' || 'https://media.licdn.com/dms/image/v2/C5112AQEc9A4FdU-VNg/article-cover_image-shrink_600_2000/article-cover_image-shrink_600_2000/0/1520139172682?e=2147483647&v=beta&t=hiQX_262KqamFfBc110Zf6EjxdvlLYN6_XVhzst4lyY'
        // contents 是一個 陣列 (array) 所以用[0]取
        t.body.contents[0].text = place.Name || '未提供名稱'
        t.body.contents[1].contents[0].contents[1].text = place.Address || '未提供地址'
        t.footer.contents[0].action.uri = 'https://www.google.com/maps/?q=' + place.Name
        // 將所有條件整合到 encodeURIComponent() 中，直接返回第一個有效值。
        const googleMapsQuery = encodeURIComponent(place.Name || place.LatLng || '未知地點')
        t.footer.contents[0].action.uri = `https://www.google.com/maps/?q=${googleMapsQuery}`
        return t
      })
    // 回覆訊息
    const result = await event.reply({
      type: 'flex',
      altText: '散步地點推薦',
      contents: {
        // carousel(旋轉木馬/行李傳輸帶) 是 LINE Flex Message 的一種佈局類型，用於顯示多個項目（例如卡片）以輪播的方式展示。
        type: 'carousel',
        contents: updatedPlaces
      }
    })
    console.log('回覆結果：', result)

    // Debug 模式下保存資料
    // fs(套件) 被用來寫入一個 JSON 檔案。
    // process.env.DEBUG === 'true' 用來檢查是否啟用了 Debug 模式。
    // result.message 表示回覆成功時，result 中只有 message 屬性才能繼續執行檔案寫入。
    if (process.env.DEBUG === 'true' && result.message) {
      // fs.writeFileSync 是一個同步方法，用於將資料寫入檔案。
      // JSON.stringify 把 updatedPlaces 陣列（已處理過的地點資料）轉換成 JSON 字串。
      // null 和 2 用來讓 JSON 格式化，增加可讀性（縮排 2 個空格）。
      fs.writeFileSync('./dump/playground.json', JSON.stringify(updatedPlaces, null, 2))
    }
    return updatedPlaces // 回傳最終結果
  } catch (error) {
    console.error('錯誤發生：', error)
  }
}
