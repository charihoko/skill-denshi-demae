(function(global){
  "use strict";
  function toMinutes(value){
    const match=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value||""));
    return match?Number(match[1])*60+Number(match[2]):null;
  }
  function overlap(a1,a2,b1,b2){return Math.max(0,Math.min(a2,b2)-Math.max(a1,b1))}
  function display(minutes){minutes=Math.max(0,Math.round(Number(minutes||0)));const h=Math.floor(minutes/60),m=minutes%60;if(m===0)return `${h}.0`;if(m===30)return `${h}.3`;return `${h}.${String(m).padStart(2,"0")}`}
  function zero(){return {valid:true,errorCode:"",errorMessage:"",totalMinutes:0,workedMinutes:0,normalMinutes:0,overtimeMinutes:0,nightMinutes:0,holidayMinutes:0,overtime100Minutes:0,overtime025Minutes:0,night025Minutes:0,holidayPremiumMinutes:0,isHoliday:false,holidayRate:0,holidayTreatment:"weekday",holidayNeedsReview:false,holidayReviewReason:"",normalDisplay:"0.0",overtimeDisplay:"0.0",nightDisplay:"0.0",holidayDisplay:"0.0"}}
  function invalid(code,message){return {...zero(),valid:false,errorCode:code,errorMessage:message}}
  function dateUTC(s){const [y,m,d]=String(s).split("-").map(Number);return new Date(Date.UTC(y,m-1,d))}
  function iso(d){return d.toISOString().slice(0,10)}
  function weekInfo(workDate,workDates=[]){const d=dateUTC(workDate),day=d.getUTCDay(),s=new Date(d);s.setUTCDate(s.getUTCDate()-day);const e=new Date(s);e.setUTCDate(e.getUTCDate()+6);const start=iso(s),end=iso(e),monthCross=start.slice(0,7)!==end.slice(0,7);const set=new Set((workDates||[]).filter(x=>x>=start&&x<=end));return {start,end,monthCross,workDays:set.size}}
  function holidayTreatment(workDate,workDates=[]){const info=weekInfo(workDate,workDates);return {...info,treatment:(info.monthCross||info.workDays>=6)?"holiday":"overtime"}}
  function calculate(start,end,workType="通常",isCalendarHoliday=false,shift="day",treatment="overtime"){
    if(["雨休","特休","有給","欠勤"].includes(workType))return zero();
    let a=toMinutes(start),b=toMinutes(end);
    if(a===null)return invalid("INVALID_START","開始時刻を正しい形式（例 08:00）で入力してください。");
    if(b===null)return invalid("INVALID_END","終了時刻を正しい形式（例 17:00）で入力してください。");
    if(b===a)return invalid("SAME_TIME","開始時刻と終了時刻が同じです。勤務時間を確認してください。");
    // 業務ルール：終了＜開始は必ず日跨ぎ夜勤として扱う。
    const crossesMidnight=b<a;
    const effectiveNight=shift==="night"||crossesMidnight;
    if(crossesMidnight)b+=1440;
    const total=b-a,worked=Math.max(0,total-90),normal=Math.min(450,worked),overtime=Math.max(0,worked-450);
    const nightAll=overlap(a,b,1320,1740)+overlap(a,b,2760,3180);
    const nightWorked=effectiveNight?Math.max(0,nightAll-75):0; // 暫定：22:00～5:00から休憩1時間15分を控除
    if(isCalendarHoliday){
      const holiday=treatment==="holiday"?worked:0,ot=treatment==="holiday"?0:worked;
      return {valid:true,errorCode:"",errorMessage:"",totalMinutes:total,workedMinutes:worked,normalMinutes:0,overtimeMinutes:ot,nightMinutes:nightWorked,holidayMinutes:holiday,overtime100Minutes:0,overtime025Minutes:0,night025Minutes:0,holidayPremiumMinutes:0,isHoliday:true,holidayRate:0,holidayTreatment:treatment,holidayNeedsReview:treatment==="holiday",holidayReviewReason:treatment==="holiday"?"会社休日を暫定的に休日欄へ計算。管理者確認が必要":"",normalDisplay:"0.0",overtimeDisplay:display(ot),nightDisplay:display(nightWorked),holidayDisplay:display(holiday)};
    }
    return {valid:true,errorCode:"",errorMessage:"",totalMinutes:total,workedMinutes:worked,normalMinutes:normal,overtimeMinutes:overtime,nightMinutes:nightWorked,holidayMinutes:0,overtime100Minutes:0,overtime025Minutes:0,night025Minutes:0,holidayPremiumMinutes:0,isHoliday:false,holidayRate:0,holidayTreatment:"weekday",holidayNeedsReview:false,holidayReviewReason:"",normalDisplay:display(normal),overtimeDisplay:display(overtime),nightDisplay:display(nightWorked),holidayDisplay:"0.0"};
  }
  global.DemaeCalc={calculate,display,weekInfo,holidayTreatment};
})(window);
