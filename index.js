// 讀取 env 檔案
import 'dotenv/config'
// 引用 linebot
import linebot from 'linebot'
import commandPlace from './commands/playground.js'

// 設定並建立機器人
const bot = linebot({
  channelId: process.env.CHANNEL_ID,
  channelSecret: process.env.CHANNEL_SECRET,
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN
})

bot.on('message', async (event) => {
  try {
    console.log('Received message:', event.message) // 記錄收到的訊息

    await event.reply([
      '您好，歡迎使用新北市散步地圖！這個機器人將會推薦您散步的最近地點。',
      '請問您目前所在地是？(請點選左下角 + 號，傳送位置資訊給我呦！)'])

    // 檢查地點訊息
    if (event.message.type === 'location') {
      console.log('檢測到地點訊息:', event.message)
      try {
        const response = await commandPlace(event) // 把用戶的地點傳遞給 playground.js 處理
        await event.reply([response, '祝您散步愉快!'])
      } catch (error) {
        console.error('處理地點訊息時發生錯誤:', error)
        await event.reply('處理您的地點資訊時發生錯誤，請稍後再試！')
      }
      return
    }

    if (event.message.type === 'text') {
      const messageText = event.message.text.toLowerCase() // 將訊息轉為小寫，方便檢查（忽略大小寫）

      // messageText.includes('關鍵字') 來檢查訊息中是否包含關鍵字。
      if (messageText.includes('thanks') || messageText.includes('謝謝')) {
        event.reply('不客氣!!')
      } else if (messageText.includes('嗨') || messageText.includes('hi') || messageText.includes('hello')) {
        event.reply('Hello!👋 ')
      }
    }
  } catch (error) {
    console.error('發送訊息時發生錯誤:', error)
  }
  // 如果訊息不包含這些關鍵字，則不回應
})

// 設定本機測試的機器人監聽路徑和 port
// 意思是沒有 process.env.PORT 那就用 3000
bot.listen('/', process.env.PORT || 3000, () => {
  console.log('機器人啟動123')
})
