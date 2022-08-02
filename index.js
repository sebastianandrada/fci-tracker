const axios = require("axios"),
  schedule = require("node-schedule");
const { Telegraf } = require("telegraf");
require('dotenv').config();
const fcis = require('./fcis')

class Tracker {
  constructor(telegramBot) {
    this.telegramBot = telegramBot;
  }
  initialize = async () => {
    this.setDataAndNotify();

    const rule = new schedule.RecurrenceRule();
    rule.dayOfWeek= new schedule.Range(1, 5);
    rule.hour = 21;
    rule.minute = 5;
    rule.tz = "America/Argentina/Buenos_Aires";

    schedule.scheduleJob(rule, () => {
      this.setDataAndNotify();
      
    })
  }

  setDataAndNotify = async () => {
    const fciDataList = await this.getDataFromFCIS(fcis)

    this.telegramBot.telegram.sendMessage(
      process.env.CHAT_ID,
      fciDataList.join("\n")
    )
    console.info("update sent!", new Date().toLocaleTimeString("es-AR"));
  }

  getDataFromFCI = async (fund, fundClass) => {
    try {
      const result = await axios.get(
        `https://api.cafci.org.ar/fondo/${fund}/clase/${fundClass}/ficha`
      );

      return result.data.data.info;
    } catch (err) {
      throw new Error("Error in data fetch fund");
    }
  }

  getDataFromFCIS = async fundList => {
    const fciDataList = new Array();
    try {
      await Promise.all(fundList.map(async (fci) => {
        const fciData = await this.getDataFromFCI(fci.fund, fci.fundClass);
        fciDataList.push(this.getMessageForMsg(fci.name, fciData));
      }))
    } catch (err) {
      throw new Error("Error in data fetch list of funds")
    }
    return fciDataList;
  }

  getMessageForMsg = (fciName, fciData) => {
    const diaryyYield = parseFloat(fciData.diaria.rendimientos.day.rendimiento);
    const monthyYield = parseFloat(fciData.diaria.rendimientos.month.rendimiento);
    const dateYield = fciData.diaria.rendimientos.day.fecha;
    return `📈 ${fciName} - ${dateYield}
    ${diaryyYield < 0 ? "🔴" : "🟢" } diario: ${diaryyYield}
    ${monthyYield < 0 ? "🔴" : "🟢" } mensual: ${monthyYield}
    `
  }
}

const telegramBot = new Telegraf(process.env.ACCESS_TOKEN_TELEGRAM);
const tracker = new Tracker(telegramBot);
tracker.initialize()
