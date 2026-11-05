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
  // 週の日～土の7日分の日付（ISO文字列）を返す。weekday は workDate 自身の曜日（0=日～6=土）。
  function weekDates(workDate){const d=dateUTC(workDate),weekday=d.getUTCDay(),s=new Date(d);s.setUTCDate(s.getUTCDate()-weekday);const dates=[];for(let i=0;i<7;i++){const x=new Date(s);x.setUTCDate(x.getUTCDate()+i);dates.push(iso(x))}return {dates,weekday}}
  // V2.6.8.13：休日手当の判定ルール（従来の「週6日以上出勤」「月またぎ週は無条件で休日」は廃止）。
  // ・休日手当の対象になり得るのは土曜日の出勤のみ。日曜・祝日など土曜日以外の会社休日は常に残業扱い。
  // ・土曜日は、同じ週の日曜～金曜の6日間が全て「出勤」または「有給」で埋まっており、
  //   かつ土曜日自体も出勤している場合にのみ休日手当（それ以外は残業扱い）。
  // ・日曜～金曜のいずれかに、雨休など「出勤」「有給」以外の記録（確定した記録）が1日でもあれば、
  //   その時点で7日間が埋まらないことが確定するため、他の日が空欄でも残業扱いに確定する。
  // ・日曜～金曜に記録が無い日（未入力）は、「実際に休んだ日」「未入力」「データ消失」のどれかを
  //   アプリの仕組み上区別できない。近くに記録があるかどうかに関わらず、休日手当・残業どちらにも
  //   自動確定せず「要確認」とする（月またぎの前月側・同月内のどちらでも同じ扱い）。
  //   ただし上記の通り、雨休など確定した非該当日が別にあれば、空欄を調べるまでもなく残業確定とする。
  // weekDayStatuses: 日～土7日分の状態配列。各要素は "work"（出勤）/"paid"（有給）/"other"（それ以外の記録あり）/"blank"（記録なし）。
  function holidayTreatment(workDate,weekDayStatuses=[]){
    const weekday=dateUTC(workDate).getUTCDay();
    if(weekday!==6)return {treatment:"overtime",needsReview:false,reviewReason:""};
    let hasBlank=false;
    for(let i=0;i<6;i++){
      const st=weekDayStatuses[i];
      if(st==="work"||st==="paid")continue;
      if(st==="blank"){hasBlank=true;continue}
      return {treatment:"overtime",needsReview:false,reviewReason:""};
    }
    if(hasBlank)return {treatment:"needs_review",needsReview:true,reviewReason:"休日手当の判定に必要な記録が一部ありません（空欄の日があるため要確認）。"};
    if(weekDayStatuses[6]==="work")return {treatment:"holiday",needsReview:true,reviewReason:"会社休日を暫定的に休日欄へ計算。管理者確認が必要"};
    return {treatment:"overtime",needsReview:false,reviewReason:""};
  }
  function calculate(start,end,workType="通常",isCalendarHoliday=false,shift="day",treatment="overtime"){
    if(["雨休","特休","有給","欠勤","振休"].includes(workType))return zero();
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
      const isHolidayPay=treatment==="holiday";
      const needsReview=treatment==="holiday"||treatment==="needs_review";
      const reviewReason=treatment==="needs_review"?"休日手当の判定に必要な記録が一部ありません（空欄の日があるため要確認）。":(treatment==="holiday"?"会社休日を暫定的に休日欄へ計算。管理者確認が必要":"");
      const holiday=isHolidayPay?worked:0,ot=isHolidayPay?0:worked;
      return {valid:true,errorCode:"",errorMessage:"",totalMinutes:total,workedMinutes:worked,normalMinutes:0,overtimeMinutes:ot,nightMinutes:nightWorked,holidayMinutes:holiday,overtime100Minutes:0,overtime025Minutes:0,night025Minutes:0,holidayPremiumMinutes:0,isHoliday:true,holidayRate:0,holidayTreatment:treatment,holidayNeedsReview:needsReview,holidayReviewReason:reviewReason,normalDisplay:"0.0",overtimeDisplay:display(ot),nightDisplay:display(nightWorked),holidayDisplay:display(holiday)};
    }
    return {valid:true,errorCode:"",errorMessage:"",totalMinutes:total,workedMinutes:worked,normalMinutes:normal,overtimeMinutes:overtime,nightMinutes:nightWorked,holidayMinutes:0,overtime100Minutes:0,overtime025Minutes:0,night025Minutes:0,holidayPremiumMinutes:0,isHoliday:false,holidayRate:0,holidayTreatment:"weekday",holidayNeedsReview:false,holidayReviewReason:"",normalDisplay:display(normal),overtimeDisplay:display(overtime),nightDisplay:display(nightWorked),holidayDisplay:"0.0"};
  }
  global.DemaeCalc={calculate,display,weekInfo,weekDates,holidayTreatment};
})(window);
