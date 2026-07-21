(function(global){
  "use strict";
  function toMinutes(value){const [h,m]=String(value).split(":").map(Number);return h*60+m}
  function overlap(a1,a2,b1,b2){return Math.max(0,Math.min(a2,b2)-Math.max(a1,b1))}
  function display(minutes){const sign=minutes<0?"-":"";minutes=Math.abs(Math.round(minutes/30)*30);const h=Math.floor(minutes/60),m=minutes%60;return `${sign}${h}.${m===30?"3":"0"}`}
  function calculate(start,end,workType="通常"){
    if(["休日","雨休","特休","有給"].includes(workType))return {totalMinutes:0,normalMinutes:0,overtimeMinutes:0,nightMinutes:0,overtime100Minutes:0,overtime025Minutes:0,night025Minutes:0,normalDisplay:"0.0",overtimeDisplay:"0.0",nightDisplay:"0.0"};
    let a=toMinutes(start),b=toMinutes(end);if(b<=a)b+=1440;
    const total=b-a;
    const normal=Math.min(450,Math.max(0,total-90));
    const overtime=Math.max(0,total-540);
    const nightAll=overlap(a,b,1320,1740)+overlap(a,b,2760,3180);
    const regularEnd=a+540;
    const nightOutside=overlap(Math.max(a,regularEnd),b,1320,1740)+overlap(Math.max(a,regularEnd),b,2760,3180);
    return {totalMinutes:total,normalMinutes:normal,overtimeMinutes:overtime,nightMinutes:nightOutside,overtime100Minutes:overtime,overtime025Minutes:nightAll,night025Minutes:nightOutside,normalDisplay:display(normal),overtimeDisplay:display(overtime),nightDisplay:display(nightOutside)};
  }
  global.DemaeCalc={calculate,display};
})(window);
