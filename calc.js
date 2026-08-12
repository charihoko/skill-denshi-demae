(function(global){
  "use strict";
  function toMinutes(value){const [h,m]=String(value).split(":").map(Number);return h*60+m}
  function overlap(a1,a2,b1,b2){return Math.max(0,Math.min(a2,b2)-Math.max(a1,b1))}
  function round30(minutes){return Math.round(Number(minutes||0)/30)*30}
  function display(minutes){const sign=minutes<0?"-":"";minutes=Math.abs(round30(minutes));const h=Math.floor(minutes/60),m=minutes%60;return `${sign}${h}.${m===30?"3":"0"}`}
  function zero(){return {totalMinutes:0,workedMinutes:0,normalMinutes:0,overtimeMinutes:0,nightMinutes:0,holidayMinutes:0,overtime100Minutes:0,overtime025Minutes:0,night025Minutes:0,holidayPremiumMinutes:0,isHoliday:false,holidayRate:0,normalDisplay:"0.0",overtimeDisplay:"0.0",nightDisplay:"0.0",holidayDisplay:"0.0"}}
  function calculate(start,end,workType="通常",isHoliday=false,shift="day",holidayRate=0.25){
    if(["雨休","特休","有給"].includes(workType))return zero();
    let a=toMinutes(start),b=toMinutes(end);if(b<=a)b+=1440;
    const total=b-a,worked=Math.max(0,total-90);
    const nightAll=overlap(a,b,1320,1740)+overlap(a,b,2760,3180);
    const regularEnd=a+540;
    const overtime100=Math.max(0,total-540);
    if(isHoliday){
      // V2.2暫定方針：休日割増と深夜割増を「1.0=1時間」へ換算して表示する。
      // 休日率は工事台帳holidayCalendar.holidayRate（現時点0.25）から受け取る。
      const holidayPremium=worked*Number(holidayRate||0.25);
      const nightPremium=nightAll*0.25;
      return {totalMinutes:total,workedMinutes:worked,normalMinutes:0,overtimeMinutes:overtime100,nightMinutes:nightPremium,holidayMinutes:holidayPremium,overtime100Minutes:overtime100,overtime025Minutes:0,night025Minutes:nightAll,holidayPremiumMinutes:holidayPremium,isHoliday:true,holidayRate:Number(holidayRate||0.25),normalDisplay:"0.0",overtimeDisplay:display(overtime100),nightDisplay:display(nightPremium),holidayDisplay:display(holidayPremium)};
    }
    const normal=Math.min(450,worked),overtime=overtime100;
    const nightOutside=overlap(Math.max(a,regularEnd),b,1320,1740)+overlap(Math.max(a,regularEnd),b,2760,3180);
    if(shift!=="night")return {totalMinutes:total,workedMinutes:worked,normalMinutes:normal,overtimeMinutes:overtime,nightMinutes:nightOutside,holidayMinutes:0,overtime100Minutes:overtime,overtime025Minutes:nightAll,night025Minutes:nightOutside,holidayPremiumMinutes:0,isHoliday:false,holidayRate:0,normalDisplay:display(normal),overtimeDisplay:display(overtime),nightDisplay:display(nightOutside),holidayDisplay:"0.0"};
    const overtimeStart=Math.min(b,regularEnd),overtimeNightOverlap=overlap(overtimeStart,b,1320,1740)+overlap(overtimeStart,b,2760,3180),overtime025=nightAll+overtime-overtimeNightOverlap;
    return {totalMinutes:total,workedMinutes:worked,normalMinutes:normal,overtimeMinutes:overtime,nightMinutes:overtimeNightOverlap,holidayMinutes:0,overtime100Minutes:overtime,overtime025Minutes:overtime025,night025Minutes:overtimeNightOverlap,holidayPremiumMinutes:0,isHoliday:false,holidayRate:0,normalDisplay:display(normal),overtimeDisplay:display(overtime025),nightDisplay:display(overtimeNightOverlap),holidayDisplay:"0.0"};
  }
  global.DemaeCalc={calculate,display};
})(window);
