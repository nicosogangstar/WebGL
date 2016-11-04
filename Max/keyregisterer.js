upFunctions = {};
downFunctions = {};
holdFunctions = {};
keys = {};

buttonMove = {down:0, up:1, hold:2};

function registerKeyPress(btnMove, buttonID, funct){
  if(btnMove == 1){
    if(upFunctions[buttonID.toString()]===undefined){
      upFunctions[buttonID.toString()] = [];
    }
    upFunctions[buttonID.toString()].push(funct);
  }else if(btnMove === 0){
    if(downFunctions[buttonID.toString()]===undefined){
      downFunctions[buttonID.toString()] = [];
    }
    downFunctions[buttonID.toString()].push(funct);
  }else{
    keys[buttonID.toString()] = false;
    if(holdFunctions[buttonID.toString()]===undefined){
      holdFunctions[buttonID.toString()] = [];
    }
    holdFunctions[buttonID.toString()].push(funct);
  }
}

document.onkeydown = function(e){
  keys[e.keyCode.toString()] = true;
//  console.log(e.keyCode.toString());
  if(downFunctions[e.keyCode.toString()]!==undefined){
    for(var i=0;i<downFunctions[e.keyCode.toString()].length; i++){
      downFunctions[e.keyCode.toString()][i]();
    }
  }
};

document.onkeyup = function(e){
  keys[e.keyCode.toString()] = false;

  if(upFunctions[e.code]!==undefined){
    for(var i=0;i<downFunctions.length; i++){
      upFunctions[e.code][i]();
    }
  }
};

function keyTick(){
  for(var i in holdFunctions){
    if(holdFunctions[i]!==undefined){
      if(keys[i] === true){
        for(var j=0;j<holdFunctions[i].length;j++){
          holdFunctions[i][j]();
        }
      }
    }
  }
}