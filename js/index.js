const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

canvas.width = 1280;
canvas.height = 768;

c.fillStyle = "white";
c.fillRect(0, 0, canvas.width, canvas.height);

const placementTilesData2D = [];
for (let i = 0; i < placementTilesData.length; i += 20) {
  placementTilesData2D.push(placementTilesData.slice(i, i + 20));
}

const placementTiles = [];
placementTilesData2D.forEach((row, y) => {
  row.forEach((symbol, x) => {
    if (symbol === 14) {
      // add building placement tile here
      placementTiles.push(
        new PlacementTile({
          position: {
            x: x * 64,
            y: y * 64,
          },
        })
      );
    }
  });
});

///////////////////////////////////

const image = new Image();
image.onload = () => {
  animate();
};
image.src = "img/gameMap.png";

const enemies = [];

function spawnEnemies(spawnCount) {
  for (let i = 1; i < spawnCount + 1; i++) {
    const xOffset = i * 150;
    enemies.push(
      new Enemy({
        position: { x: waypoints[0].x - xOffset, y: waypoints[0].y },
      })
    );
  }
}

const buildings = [];
let activeTile = undefined;
let enemyCount = 3;
let hearts = 10;
let coins = 100;
const explosions = [];

let ready = false;
let enemyspeed = 2;
let towerDamage = 20;
let curPower = 5;
let check = 2;
let kills = 0;
let healsUsed = 0;
let wave = 1;
let towercount = 0;

spawnEnemies(enemyCount);

//////// ANIMATE /////////////////
function animate() {
  const animationId = requestAnimationFrame(animate);

  c.drawImage(image, 0, 0);
  if (ready) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      enemy.update();

      if (enemy.position.x > canvas.width) {
        hearts -= 1;
        enemies.splice(i, 1);
        document.querySelector("#hearts").innerHTML = hearts;

        if (hearts === 0) {
          cancelAnimationFrame(animationId);
          document.querySelector("#gameOver").style.display = "flex";
        }
      }
    }

    for (let i = explosions.length - 1; i >= 0; i--) {
      const explosion = explosions[i];
      explosion.draw();
      explosion.update();

      if (explosion.frames.current >= explosion.frames.max - 1) {
        explosions.splice(i, 1);
      }
    }

    //tracking total amount of enemies
    if (enemies.length === 0) {
      if (enemyCount >= 45) {
        cancelAnimationFrame(animationId);
        document.querySelector("#victoryid").style.display = "flex";
        document.querySelector("#healed").style.display = "flex";
        document.querySelector("#healed").innerHTML =
          "Heals used: " + healsUsed;
      }
      enemyCount += 3;
      wave++;
      spawnEnemies(enemyCount);
      enemies.forEach((enemy) => {
        enemy.speed = enemyspeed;
      });
      if (enemyspeed < 12 && check % 2 === 0) {
        enemyspeed++;
        check++;
      } else {
        check++;
      }
      if (wave < 16)
        document.querySelector("#waveid").innerHTML = "Wave: " + wave + "/15";
    }

    placementTiles.forEach((tile) => {
      tile.update(mouse);
    });

    buildings.forEach((building) => {
      building.projectileSpeed = curPower;
      building.update();
      building.target = null;
      const validEnemies = enemies.filter((enemy) => {
        const xDifference = enemy.center.x - building.center.x;
        const yDifference = enemy.center.y - building.center.y;
        const distance = Math.hypot(xDifference, yDifference);
        return distance < enemy.radius + building.radius;
      });
      building.target = validEnemies[0];

      for (let i = building.projectiles.length - 1; i >= 0; i--) {
        const projectile = building.projectiles[i];

        projectile.update();

        // collision detection (projectile destruction)
        const xDifference = projectile.enemy.center.x - projectile.position.x;
        const yDifference = projectile.enemy.center.y - projectile.position.y;
        const distance = Math.hypot(xDifference, yDifference);

        // when projectile hits an enemy
        if (distance < projectile.enemy.radius + projectile.radius) {
          // enemy health and removal
          projectile.enemy.health -= towerDamage;
          if (projectile.enemy.health <= 0) {
            const enemyIndex = enemies.findIndex((enemy) => {
              return projectile.enemy === enemy;
            });

            if (enemyIndex > -1) {
              enemies.splice(enemyIndex, 1);
              coins += 20;
              kills += 1;
              document.querySelector("#coins").innerHTML = coins;
              document.querySelector("#kills").innerHTML = kills;
            }
          }

          explosions.push(
            new Sprite({
              position: { x: projectile.position.x, y: projectile.position.y },
              imageSrc: "./img/explosion.png",
              frames: { max: 4 },
              offset: { x: 0, y: 0 },
            })
          );
          building.projectiles.splice(i, 1);
        }
      }
    });
  }
}

const mouse = {
  x: undefined,
  y: undefined,
};

//////////////// COINS ////////////////
function reduceCoins(amount) {
  coins -= amount;
  document.querySelector("#coins").innerHTML = coins;
}
//////////////// BUILD ////////////////
canvas.addEventListener("click", (event) => {
  if (towercount >= 10 && activeTile && !activeTile.isOccupied && coins >= 80) {
    reduceCoins(80);
    document.querySelector("#coins").innerHTML = coins;
    buildings.push(
      new Building({
        position: {
          x: activeTile.position.x,
          y: activeTile.position.y,
        },
      })
    );
    activeTile.isOccupied = true;
    towercount++;
    // layering buildings
    buildings.sort((a, b) => {
      return a.position.y - b.position.y; // 100 - 110 = -10 (moves)
    });
  }

  if (towercount < 10 && activeTile && !activeTile.isOccupied && coins >= 50) {
    reduceCoins(50);
    document.querySelector("#coins").innerHTML = coins;
    buildings.push(
      new Building({
        position: {
          x: activeTile.position.x,
          y: activeTile.position.y,
        },
      })
    );
    activeTile.isOccupied = true;
    towercount++;
    if (towercount === 10)
      document.querySelector("#tower-cost").innerHTML = "Tower cost: 80 coins";
    // layering buildings
    buildings.sort((a, b) => {
      return a.position.y - b.position.y; // 100 - 110 = -10 (moves)
    });
  }
});

window.addEventListener("mousemove", (event) => {
  mouse.x = event.clientX;
  mouse.y = event.clientY;

  activeTile = null;
  for (let i = 0; i < placementTiles.length; i++) {
    const tile = placementTiles[i];
    if (
      mouse.x > tile.position.x &&
      mouse.x < tile.position.x + tile.size &&
      mouse.y > tile.position.y &&
      mouse.y < tile.position.y + tile.size
    ) {
      activeTile = tile;
      break;
    }
  }
});

//////////////// START ////////////////
const gamestart = {
  section: document.getElementById("startpage"),
  link: document.getElementById("button"),
};
gamestart.link.addEventListener("click", () => startgame());

function startgame() {
  gamestart.section.style.display = "none";
  ready = true;
}

//////////////// POWER UP ////////////////
const damageUpgrade = document.getElementById("power-me");
damageUpgrade.addEventListener("click", () => increasedmg());
function increasedmg() {
  if (towerDamage == 30 && coins >= 1000) {
    towerDamage += 10;
    reduceCoins(1000);
    buildings.forEach((building) => {
      building.radius += 50;
    });
    document.querySelector("#menu-power").innerHTML = "MAX";
    document.querySelector("#power-cost").innerHTML = "";
  }
  if (towerDamage == 20 && coins >= 500) {
    towerDamage += 10;
    reduceCoins(500);
    buildings.forEach((building) => {
      building.radius += 50;
    });
    document.querySelector("#menu-power").innerHTML = "STRONG";
    document.querySelector("#power-cost").innerHTML = "Cost: 1000";
  }
}
//////////////// HEAL ////////////////
const heal = document.getElementById("heal-me");
heal.addEventListener("click", () => healMe());
function healMe() {
  if (hearts < 10 && coins >= 20 && healsUsed <= 3) {
    hearts++;
    healsUsed++;
    reduceCoins(20);
    document.querySelector("#hearts").innerHTML = hearts;
    if (healsUsed > 3)
      document.querySelector("#heal-count").innerHTML = "Cost: 40";
  }
  if (hearts < 10 && coins >= 40 && healsUsed > 3) {
    hearts++;
    healsUsed++;
    reduceCoins(40);
    document.querySelector("#hearts").innerHTML = hearts;
  }
}

//////////////// SPEED  UP ////////////////
const speedUp = document.getElementById("speed-me");
speedUp.addEventListener("click", () => speedMe());
function speedMe() {
  if (curPower > 13 && curPower <= 18 && coins >= 500) {
    curPower += 1;
    reduceCoins(500);
    if (curPower === 19) {
      document.querySelector("#speed-cost").innerHTML = "";
      document.querySelector("#menu-speed").innerHTML = "MAX";
    } else
      document.querySelector("#menu-speed").innerHTML = "LvL: " + (curPower - 4);
  }
  if (curPower < 14 && coins >= 50) {
    curPower += 1;
    reduceCoins(50);
    if (curPower === 14) {
      document.querySelector("#speed-cost").innerHTML = "Cost: 500";
    }
    document.querySelector("#menu-speed").innerHTML = "LvL: " + (curPower - 4);
  }
}
