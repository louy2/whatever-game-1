// ============================================================
// Ghost Mansion - 幽灵洋馆
// A Luigi's Mansion-style ghost hunting game built with Phaser 3
// ============================================================

// ---- Constants ----
const GAME_W = 1024;
const GAME_H = 768;
const TILE = 48;
const GRAVITY = 800;
const PLAYER_SPEED = 200;
const JUMP_VELOCITY = -420;
const VACUUM_RANGE = 200;
const VACUUM_ANGLE = 40; // degrees half-width
const FLASHLIGHT_RANGE = 300;
const FLASH_RANGE = 250;
const FLASH_COOLDOWN = 3000;
const GHOST_SPEED = 80;

// ---- Procedural texture helpers ----
function createTextures(scene) {
  // -- Player (small robot character ~32x48) --
  const pg = scene.make.graphics({ add: false });
  // Body
  pg.fillStyle(0x4488cc);
  pg.fillRoundedRect(4, 16, 24, 24, 4);
  // Head
  pg.fillStyle(0x66aaee);
  pg.fillRoundedRect(6, 2, 20, 16, 3);
  // Eyes
  pg.fillStyle(0xffffff);
  pg.fillCircle(12, 9, 3);
  pg.fillCircle(20, 9, 3);
  pg.fillStyle(0x111111);
  pg.fillCircle(13, 9, 1.5);
  pg.fillCircle(21, 9, 1.5);
  // Legs
  pg.fillStyle(0x3366aa);
  pg.fillRect(8, 40, 6, 8);
  pg.fillRect(18, 40, 6, 8);
  // Backpack (vacuum tank)
  pg.fillStyle(0x888888);
  pg.fillRoundedRect(24, 18, 8, 18, 2);
  pg.fillStyle(0xaacc44);
  pg.fillCircle(28, 22, 3);
  pg.generateTexture('player', 32, 48);
  pg.destroy();

  // -- Vacuum beam (cone shape) --
  const vg = scene.make.graphics({ add: false });
  vg.fillStyle(0x88ccff, 0.3);
  vg.beginPath();
  vg.moveTo(0, 20);
  vg.lineTo(200, 0);
  vg.lineTo(200, 40);
  vg.closePath();
  vg.fillPath();
  vg.lineStyle(2, 0xaaddff, 0.5);
  vg.beginPath();
  vg.moveTo(0, 20);
  vg.lineTo(200, 0);
  vg.moveTo(0, 20);
  vg.lineTo(200, 40);
  vg.closePath();
  vg.strokePath();
  vg.generateTexture('vacuum_beam', 200, 40);
  vg.destroy();

  // -- Flashlight beam --
  const fg = scene.make.graphics({ add: false });
  fg.fillStyle(0xffffaa, 0.25);
  fg.beginPath();
  fg.moveTo(0, 30);
  fg.lineTo(300, 0);
  fg.lineTo(300, 60);
  fg.closePath();
  fg.fillPath();
  fg.generateTexture('flashlight_beam', 300, 60);
  fg.destroy();

  // -- Flash effect (circle) --
  const flg = scene.make.graphics({ add: false });
  flg.fillStyle(0xffffff, 0.6);
  flg.fillCircle(128, 128, 128);
  flg.fillStyle(0xffffff, 0.3);
  flg.fillCircle(128, 128, 200);
  flg.generateTexture('flash_effect', 256, 256);
  flg.destroy();

  // -- Darkness mask: large black image with transparent radial hole in center --
  const maskSize = 2048;
  const lightR = 200; // base light radius in the texture
  const darkCanvas = document.createElement('canvas');
  darkCanvas.width = maskSize;
  darkCanvas.height = maskSize;
  const dctx = darkCanvas.getContext('2d');
  // Fill entire canvas black
  dctx.fillStyle = 'rgba(5,5,16,1)';
  dctx.fillRect(0, 0, maskSize, maskSize);
  // Punch a radial gradient hole in the center
  dctx.globalCompositeOperation = 'destination-out';
  const gradient = dctx.createRadialGradient(
    maskSize / 2, maskSize / 2, 0,
    maskSize / 2, maskSize / 2, lightR
  );
  gradient.addColorStop(0, 'rgba(0,0,0,1)');
  gradient.addColorStop(0.5, 'rgba(0,0,0,0.8)');
  gradient.addColorStop(0.8, 'rgba(0,0,0,0.3)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  dctx.fillStyle = gradient;
  dctx.fillRect(0, 0, maskSize, maskSize);
  dctx.globalCompositeOperation = 'source-over';
  scene.textures.addCanvas('darkness_mask', darkCanvas);

  // -- Hourglass Ghost (沙漏形幽灵) --
  createGhostTexture(scene, 'ghost', 0xaa44ff);
  createGhostTexture(scene, 'ghost_stunned', 0x8888ff);

  // -- Floor tile --
  const tg = scene.make.graphics({ add: false });
  tg.fillStyle(0x554433);
  tg.fillRect(0, 0, TILE, TILE);
  tg.fillStyle(0x665544);
  tg.fillRect(2, 2, TILE - 4, TILE - 4);
  tg.lineStyle(1, 0x443322, 0.5);
  tg.strokeRect(0, 0, TILE, TILE);
  // Wood grain
  tg.lineStyle(1, 0x4a3a2a, 0.3);
  for (let i = 0; i < 5; i++) {
    const y = 6 + i * 9;
    tg.beginPath();
    tg.moveTo(2, y);
    tg.lineTo(TILE - 2, y + (Math.random() * 4 - 2));
    tg.strokePath();
  }
  tg.generateTexture('floor', TILE, TILE);
  tg.destroy();

  // -- Wall tile --
  const wg = scene.make.graphics({ add: false });
  wg.fillStyle(0x443355);
  wg.fillRect(0, 0, TILE, TILE);
  wg.fillStyle(0x554466);
  wg.fillRect(2, 2, TILE - 4, TILE - 4);
  wg.lineStyle(1, 0x332244, 0.5);
  wg.strokeRect(0, 0, TILE, TILE);
  // Wallpaper pattern
  wg.fillStyle(0x665577, 0.3);
  wg.fillRect(10, 10, 8, 8);
  wg.fillRect(30, 30, 8, 8);
  wg.generateTexture('wall', TILE, TILE);
  wg.destroy();

  // -- Ceiling tile --
  const cg = scene.make.graphics({ add: false });
  cg.fillStyle(0x333344);
  cg.fillRect(0, 0, TILE, TILE);
  cg.lineStyle(1, 0x222233, 0.5);
  cg.strokeRect(0, 0, TILE, TILE);
  cg.generateTexture('ceiling', TILE, TILE);
  cg.destroy();

  // -- Door --
  const dg = scene.make.graphics({ add: false });
  dg.fillStyle(0x664422);
  dg.fillRoundedRect(0, 0, TILE, TILE * 2, 4);
  dg.fillStyle(0x553311);
  dg.fillRoundedRect(4, 4, TILE - 8, TILE - 8, 2);
  dg.fillRoundedRect(4, TILE + 4, TILE - 8, TILE - 12, 2);
  // Doorknob
  dg.fillStyle(0xccaa44);
  dg.fillCircle(TILE - 10, TILE, 4);
  dg.generateTexture('door', TILE, TILE * 2);
  dg.destroy();

  // -- Particle --
  const partg = scene.make.graphics({ add: false });
  partg.fillStyle(0xffffff);
  partg.fillCircle(4, 4, 4);
  partg.generateTexture('particle', 8, 8);
  partg.destroy();

  // -- Touch control buttons --
  createButtonTexture(scene, 'btn_left', '◀', 64);
  createButtonTexture(scene, 'btn_right', '▶', 64);
  createButtonTexture(scene, 'btn_jump', '▲', 64);
  createButtonTexture(scene, 'btn_vacuum', '吸', 64);
  createButtonTexture(scene, 'btn_flash', '闪', 64);
  createButtonTexture(scene, 'btn_switch', '换', 56);

  // -- Furniture: Bookshelf --
  const bsg = scene.make.graphics({ add: false });
  bsg.fillStyle(0x553322);
  bsg.fillRect(0, 0, TILE * 2, TILE * 2);
  bsg.fillStyle(0x664433);
  bsg.fillRect(4, 4, TILE * 2 - 8, 18);
  bsg.fillRect(4, 26, TILE * 2 - 8, 18);
  bsg.fillRect(4, 50, TILE * 2 - 8, 18);
  bsg.fillRect(4, 74, TILE * 2 - 8, 18);
  // Books
  const bookColors = [0xcc3333, 0x33cc33, 0x3333cc, 0xcccc33, 0xcc6633];
  for (let row = 0; row < 4; row++) {
    const y = 6 + row * 24;
    for (let b = 0; b < 6; b++) {
      bsg.fillStyle(bookColors[b % bookColors.length]);
      bsg.fillRect(8 + b * 14, y, 10, 14);
    }
  }
  bsg.generateTexture('bookshelf', TILE * 2, TILE * 2);
  bsg.destroy();

  // -- Furniture: Table --
  const tbg = scene.make.graphics({ add: false });
  tbg.fillStyle(0x665533);
  tbg.fillRect(0, 0, TILE * 2, 12);
  tbg.fillRect(6, 12, 8, TILE - 12);
  tbg.fillRect(TILE * 2 - 14, 12, 8, TILE - 12);
  tbg.generateTexture('table', TILE * 2, TILE);
  tbg.destroy();

  // -- Candle --
  const cag = scene.make.graphics({ add: false });
  cag.fillStyle(0xeeeecc);
  cag.fillRect(6, 10, 6, 14);
  cag.fillStyle(0xffaa22);
  cag.fillCircle(9, 8, 5);
  cag.fillStyle(0xffdd44, 0.5);
  cag.fillCircle(9, 8, 8);
  cag.generateTexture('candle', 18, 24);
  cag.destroy();

  // -- Window --
  const wng = scene.make.graphics({ add: false });
  wng.fillStyle(0x334455);
  wng.fillRect(0, 0, TILE, TILE * 2);
  wng.fillStyle(0x112233);
  wng.fillRect(4, 4, TILE - 8, TILE * 2 - 8);
  // Moon visible through window
  wng.fillStyle(0xddddaa, 0.4);
  wng.fillCircle(20, 20, 10);
  // Window frame cross
  wng.lineStyle(3, 0x334455);
  wng.beginPath();
  wng.moveTo(TILE / 2, 4);
  wng.lineTo(TILE / 2, TILE * 2 - 4);
  wng.moveTo(4, TILE);
  wng.lineTo(TILE - 4, TILE);
  wng.strokePath();
  wng.generateTexture('window', TILE, TILE * 2);
  wng.destroy();
}

function createGhostTexture(scene, key, color) {
  const gg = scene.make.graphics({ add: false });
  const w = 40, h = 56;
  const cx = w / 2;

  // Hourglass body shape (沙漏形)
  gg.fillStyle(color, 0.7);
  // Top triangle
  gg.beginPath();
  gg.moveTo(cx - 18, 4);
  gg.lineTo(cx + 18, 4);
  gg.lineTo(cx + 4, h / 2);
  gg.lineTo(cx - 4, h / 2);
  gg.closePath();
  gg.fillPath();
  // Bottom triangle
  gg.beginPath();
  gg.moveTo(cx - 4, h / 2);
  gg.lineTo(cx + 4, h / 2);
  gg.lineTo(cx + 18, h - 8);
  gg.lineTo(cx - 18, h - 8);
  gg.closePath();
  gg.fillPath();

  // Outer glow
  gg.fillStyle(color, 0.15);
  gg.fillCircle(cx, h / 2, 24);

  // Eyes (menacing)
  gg.fillStyle(0xff3333);
  gg.fillCircle(cx - 7, 16, 4);
  gg.fillCircle(cx + 7, 16, 4);
  gg.fillStyle(0xffffff);
  gg.fillCircle(cx - 7, 15, 2);
  gg.fillCircle(cx + 7, 15, 2);

  // Wispy tendrils at bottom
  gg.lineStyle(2, color, 0.5);
  for (let i = -2; i <= 2; i++) {
    gg.beginPath();
    gg.moveTo(cx + i * 7, h - 8);
    gg.lineTo(cx + i * 9, h);
    gg.strokePath();
  }

  // Decorative bands at waist
  gg.lineStyle(2, 0xffdd88, 0.6);
  gg.strokeCircle(cx, h / 2, 6);

  gg.generateTexture(key, w, h);
  gg.destroy();
}

function createButtonTexture(scene, key, label, size) {
  const bg = scene.make.graphics({ add: false });
  bg.fillStyle(0x000000, 0.4);
  bg.fillCircle(size / 2, size / 2, size / 2);
  bg.lineStyle(2, 0xffffff, 0.5);
  bg.strokeCircle(size / 2, size / 2, size / 2 - 2);
  bg.generateTexture(key, size, size);
  bg.destroy();
}

// ============================================================
// Boot Scene - Loading
// ============================================================
class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    createTextures(this);
    this.scene.start('Menu');
  }
}

// ============================================================
// Menu Scene
// ============================================================
class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    // Dark background
    this.cameras.main.setBackgroundColor(0x111122);

    // Title
    this.add.text(cx, cy - 120, '幽灵洋馆', {
      fontSize: '64px', fontFamily: 'serif',
      color: '#aa88ff', stroke: '#000', strokeThickness: 6,
      shadow: { offsetX: 3, offsetY: 3, color: '#000', blur: 10, fill: true }
    }).setOrigin(0.5);

    this.add.text(cx, cy - 50, 'Ghost Mansion', {
      fontSize: '28px', fontFamily: 'serif',
      color: '#8866cc', stroke: '#000', strokeThickness: 3
    }).setOrigin(0.5);

    // Ghost floating animation
    const ghost = this.add.image(cx, cy + 40, 'ghost').setScale(2);
    this.tweens.add({
      targets: ghost, y: cy + 55, duration: 2000,
      yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // Start button
    const startBtn = this.add.text(cx, cy + 140, '[ 开始游戏 / START ]', {
      fontSize: '32px', fontFamily: 'monospace',
      color: '#ffdd88', stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    startBtn.on('pointerover', () => startBtn.setColor('#ffffff'));
    startBtn.on('pointerout', () => startBtn.setColor('#ffdd88'));
    startBtn.on('pointerdown', () => this.scene.start('Game'));

    // Controls info
    this.add.text(cx, cy + 210, '方向键/WASD 移动 | 空格 跳跃 | Z 吸尘器 | X 闪光灯 | C 切换武器', {
      fontSize: '14px', fontFamily: 'monospace',
      color: '#888899', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5);

    this.add.text(cx, cy + 240, '触屏: 虚拟按钮操控 | iPad 友好', {
      fontSize: '14px', fontFamily: 'monospace',
      color: '#888899', stroke: '#000', strokeThickness: 2
    }).setOrigin(0.5);

    // Flicker effect
    this.time.addEvent({
      delay: 3000 + Math.random() * 2000,
      callback: () => {
        this.cameras.main.flash(100, 20, 10, 30);
      },
      loop: true
    });
  }
}

// ============================================================
// Game Scene - Main gameplay
// ============================================================
class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    // ---- State ----
    this.playerHP = 100;
    this.maxHP = 100;
    this.score = 0;
    this.ghostsCaptured = 0;
    this.totalGhosts = 0;
    this.currentWeapon = 'vacuum'; // vacuum, flashlight
    this.flashCooldownTimer = 0;
    this.isVacuuming = false;
    this.facingRight = true;

    // ---- World ----
    this.cameras.main.setBackgroundColor(0x0a0a15);
    this.physics.world.gravity.y = GRAVITY;

    // Build level
    this.buildLevel();

    // ---- Player ----
    this.player = this.physics.add.sprite(120, 500, 'player');
    this.player.setDepth(3);
    this.player.setCollideWorldBounds(true);
    this.player.body.setSize(24, 44);
    this.player.body.setOffset(4, 4);

    // ---- Weapon visuals ----
    this.vacuumBeam = this.add.image(0, 0, 'vacuum_beam')
      .setOrigin(0, 0.5).setVisible(false).setDepth(5).setAlpha(0.7);
    this.flashlightBeam = this.add.image(0, 0, 'flashlight_beam')
      .setOrigin(0, 0.5).setVisible(false).setDepth(5).setAlpha(0.5);
    this.flashEffect = this.add.image(0, 0, 'flash_effect')
      .setVisible(false).setDepth(10).setAlpha(0).setScale(2);

    // ---- Ghosts ----
    this.ghosts = this.physics.add.group();
    this.spawnGhosts();

    // ---- Collisions ----
    this.physics.add.collider(this.player, this.platforms);
    this.physics.add.collider(this.ghosts, this.platforms);

    // Ghost-player overlap for damage
    this.physics.add.overlap(this.player, this.ghosts, this.onGhostTouch, null, this);

    // ---- Camera ----
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setBounds(0, 0, this.levelWidth, this.levelHeight);
    this.physics.world.setBounds(0, 0, this.levelWidth, this.levelHeight);

    // ---- Darkness overlay: a large dark sprite with a transparent hole, follows the player ----
    this.darknessMask = this.add.image(0, 0, 'darkness_mask').setDepth(15).setScale(1);
    this.lightRadius = 120;

    // ---- Input ----
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys({
      up: 'W', down: 'S', left: 'A', right: 'D'
    });
    this.keyZ = this.input.keyboard.addKey('Z');
    this.keyX = this.input.keyboard.addKey('X');
    this.keyC = this.input.keyboard.addKey('C');
    this.keySpace = this.input.keyboard.addKey('SPACE');

    // ---- Touch Controls ----
    this.touchState = { left: false, right: false, jump: false, action: false, flash: false };
    this.createTouchControls();

    // ---- HUD ----
    this.createHUD();

    // ---- Ambient sounds simulation (screen shake on events) ----
    this.damageCooldown = 0;

    // ---- Lighting flicker timer ----
    this.time.addEvent({
      delay: 2000 + Math.random() * 3000,
      callback: () => {
        this.lightRadius = 80 + Math.random() * 20;
        this.time.delayedCall(150, () => { this.lightRadius = 120; });
      },
      loop: true
    });
  }

  // ---- Level Builder ----
  buildLevel() {
    this.levelWidth = TILE * 42;
    this.levelHeight = TILE * 16;
    this.platforms = this.physics.add.staticGroup();
    this.decorations = this.add.group();

    // Level layout: 0=empty, 1=floor, 2=wall, 3=ceiling, 4=platform
    const layout = [
      '333333333333333333333333333333333333333333',
      '2000000000000000000020000000000000000000002',
      '2000000000000000000020000000000000000000002',
      '2000000000000000000020000000000000000000002',
      '2000000000000000000000000000000000000000002',
      '2000000000000000000000000000000000000000002',
      '2000000000000000000000004440000000000000002',
      '2000000000000000000000000000000000000000002',
      '2000000044400000000000000000000000444000002',
      '2000000000000000000020000000000000000000002',
      '2000000000000000444020000044400000000000002',
      '2000000000000000000020000000000000000000002',
      '2000000000000000000020000000000000000000002',
      '2000000000000000000020000000000000000000002',
      '111111111111111111111111111111111111111111',
      '111111111111111111111111111111111111111111',
    ];

    for (let row = 0; row < layout.length; row++) {
      for (let col = 0; col < layout[row].length; col++) {
        const tile = layout[row][col];
        const x = col * TILE + TILE / 2;
        const y = row * TILE + TILE / 2;

        if (tile === '1') {
          this.platforms.create(x, y, 'floor');
        } else if (tile === '2') {
          this.platforms.create(x, y, 'wall');
        } else if (tile === '3') {
          this.platforms.create(x, y, 'ceiling');
        } else if (tile === '4') {
          const plat = this.platforms.create(x, y, 'floor');
          plat.setAlpha(0.9);
        }
      }
    }

    // Decorations
    // Bookshelves
    this.add.image(TILE * 3, TILE * 12, 'bookshelf').setOrigin(0.5, 1).setDepth(0);
    this.add.image(TILE * 7, TILE * 12, 'bookshelf').setOrigin(0.5, 1).setDepth(0);
    this.add.image(TILE * 28, TILE * 12, 'bookshelf').setOrigin(0.5, 1).setDepth(0);

    // Tables
    this.add.image(TILE * 12, TILE * 14 - 6, 'table').setOrigin(0.5, 1).setDepth(0);
    this.add.image(TILE * 32, TILE * 14 - 6, 'table').setOrigin(0.5, 1).setDepth(0);

    // Candles (on tables)
    const candle1 = this.add.image(TILE * 12, TILE * 14 - TILE + 6, 'candle').setDepth(1);
    const candle2 = this.add.image(TILE * 32, TILE * 14 - TILE + 6, 'candle').setDepth(1);
    // Candle flicker
    this.tweens.add({ targets: [candle1, candle2], alpha: 0.6, duration: 200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Windows
    this.add.image(TILE * 5, TILE * 2.5, 'window').setDepth(0);
    this.add.image(TILE * 15, TILE * 2.5, 'window').setDepth(0);
    this.add.image(TILE * 35, TILE * 2.5, 'window').setDepth(0);

    // Doors
    this.add.image(TILE * 10, TILE * 13, 'door').setOrigin(0.5, 1).setDepth(0);
    this.add.image(TILE * 25, TILE * 13, 'door').setOrigin(0.5, 1).setDepth(0);
    this.add.image(TILE * 38, TILE * 13, 'door').setOrigin(0.5, 1).setDepth(0);
  }

  // ---- Ghost Spawner ----
  spawnGhosts() {
    const spawnPoints = [
      { x: TILE * 8, y: TILE * 6 },
      { x: TILE * 15, y: TILE * 8 },
      { x: TILE * 22, y: TILE * 5 },
      { x: TILE * 30, y: TILE * 7 },
      { x: TILE * 35, y: TILE * 4 },
      { x: TILE * 12, y: TILE * 3 },
      { x: TILE * 38, y: TILE * 10 },
    ];

    spawnPoints.forEach(pt => {
      const ghost = this.ghosts.create(pt.x, pt.y, 'ghost');
      ghost.setDepth(4);
      ghost.setBounce(0.2);
      ghost.setCollideWorldBounds(true);
      ghost.body.setSize(30, 48);
      ghost.body.setOffset(5, 4);
      ghost.body.setAllowGravity(false);
      ghost.setData('hp', 100);
      ghost.setData('maxHp', 100);
      ghost.setData('stunned', false);
      ghost.setData('stunTimer', 0);
      ghost.setData('visible', true);
      ghost.setData('aiTimer', 0);
      ghost.setData('aiState', 'wander'); // wander, chase, flee
      ghost.setData('wanderDir', Math.random() > 0.5 ? 1 : -1);
      ghost.setAlpha(0.8);
      this.totalGhosts++;
    });
  }

  // ---- Touch Controls ----
  createTouchControls() {
    if (!this.sys.game.device.input.touch) return;

    const cam = this.cameras.main;
    const bottom = cam.height - 20;

    // Left button
    const btnLeft = this.add.image(80, bottom - 60, 'btn_left')
      .setScrollFactor(0).setDepth(100).setAlpha(0.6).setInteractive();
    this.add.text(80, bottom - 60, '◀', {
      fontSize: '28px', color: '#fff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    btnLeft.on('pointerdown', () => this.touchState.left = true);
    btnLeft.on('pointerup', () => this.touchState.left = false);
    btnLeft.on('pointerout', () => this.touchState.left = false);

    // Right button
    const btnRight = this.add.image(180, bottom - 60, 'btn_right')
      .setScrollFactor(0).setDepth(100).setAlpha(0.6).setInteractive();
    this.add.text(180, bottom - 60, '▶', {
      fontSize: '28px', color: '#fff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    btnRight.on('pointerdown', () => this.touchState.right = true);
    btnRight.on('pointerup', () => this.touchState.right = false);
    btnRight.on('pointerout', () => this.touchState.right = false);

    // Jump button
    const btnJump = this.add.image(cam.width - 80, bottom - 140, 'btn_jump')
      .setScrollFactor(0).setDepth(100).setAlpha(0.6).setInteractive();
    this.add.text(cam.width - 80, bottom - 140, '跳', {
      fontSize: '22px', color: '#fff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    btnJump.on('pointerdown', () => this.touchState.jump = true);
    btnJump.on('pointerup', () => this.touchState.jump = false);
    btnJump.on('pointerout', () => this.touchState.jump = false);

    // Action button (vacuum / flashlight)
    const btnAction = this.add.image(cam.width - 180, bottom - 60, 'btn_vacuum')
      .setScrollFactor(0).setDepth(100).setAlpha(0.6).setInteractive();
    this.btnActionLabel = this.add.text(cam.width - 180, bottom - 60, '吸', {
      fontSize: '22px', color: '#88ccff'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    btnAction.on('pointerdown', () => this.touchState.action = true);
    btnAction.on('pointerup', () => this.touchState.action = false);
    btnAction.on('pointerout', () => this.touchState.action = false);

    // Flash button
    const btnFlash = this.add.image(cam.width - 80, bottom - 60, 'btn_flash')
      .setScrollFactor(0).setDepth(100).setAlpha(0.6).setInteractive();
    this.add.text(cam.width - 80, bottom - 60, '闪', {
      fontSize: '22px', color: '#ffdd44'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    btnFlash.on('pointerdown', () => this.touchState.flash = true);
    btnFlash.on('pointerup', () => this.touchState.flash = false);
    btnFlash.on('pointerout', () => this.touchState.flash = false);

    // Weapon switch button
    const btnSwitch = this.add.image(cam.width - 130, bottom - 120, 'btn_switch')
      .setScrollFactor(0).setDepth(100).setAlpha(0.5).setScale(0.8).setInteractive();
    this.add.text(cam.width - 130, bottom - 120, '换', {
      fontSize: '18px', color: '#aaa'
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
    btnSwitch.on('pointerdown', () => {
      this.currentWeapon = this.currentWeapon === 'vacuum' ? 'flashlight' : 'vacuum';
      this.updateWeaponUI();
    });
  }

  // ---- HUD ----
  createHUD() {
    const hudY = 16;

    // HP bar background
    this.add.graphics().setScrollFactor(0).setDepth(90)
      .fillStyle(0x000000, 0.6).fillRoundedRect(14, hudY - 4, 204, 24, 4);

    // HP bar
    this.hpBar = this.add.graphics().setScrollFactor(0).setDepth(91);

    // HP label
    this.add.text(18, hudY - 2, 'HP', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ff8888',
      stroke: '#000', strokeThickness: 2
    }).setScrollFactor(0).setDepth(92);

    // Score
    this.scoreText = this.add.text(16, hudY + 28, '得分: 0', {
      fontSize: '18px', fontFamily: 'monospace', color: '#ffdd88',
      stroke: '#000', strokeThickness: 3
    }).setScrollFactor(0).setDepth(90);

    // Ghost count
    this.ghostText = this.add.text(16, hudY + 52, '幽灵: 0/' + this.totalGhosts, {
      fontSize: '16px', fontFamily: 'monospace', color: '#aa88ff',
      stroke: '#000', strokeThickness: 3
    }).setScrollFactor(0).setDepth(90);

    // Weapon indicator
    this.weaponText = this.add.text(this.cameras.main.width - 16, hudY, '武器: 吸尘器', {
      fontSize: '18px', fontFamily: 'monospace', color: '#88ccff',
      stroke: '#000', strokeThickness: 3
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(90);

    // Flash cooldown
    this.flashCDText = this.add.text(this.cameras.main.width - 16, hudY + 26, '闪光灯: 就绪', {
      fontSize: '14px', fontFamily: 'monospace', color: '#ffdd44',
      stroke: '#000', strokeThickness: 2
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(90);

    this.updateHPBar();
  }

  updateHPBar() {
    this.hpBar.clear();
    const ratio = this.playerHP / this.maxHP;
    const color = ratio > 0.5 ? 0x44cc44 : ratio > 0.25 ? 0xcccc44 : 0xcc4444;
    this.hpBar.fillStyle(color, 0.9);
    this.hpBar.fillRoundedRect(40, 14, 174 * ratio, 18, 3);
  }

  updateWeaponUI() {
    if (this.currentWeapon === 'vacuum') {
      this.weaponText.setText('武器: 吸尘器');
      this.weaponText.setColor('#88ccff');
      if (this.btnActionLabel) this.btnActionLabel.setText('吸').setColor('#88ccff');
    } else {
      this.weaponText.setText('武器: 手电筒');
      this.weaponText.setColor('#ffeeaa');
      if (this.btnActionLabel) this.btnActionLabel.setText('照').setColor('#ffeeaa');
    }
  }

  // ---- Ghost AI ----
  updateGhostAI(ghost, delta) {
    if (!ghost.active) return;

    const stunned = ghost.getData('stunned');
    const stunTimer = ghost.getData('stunTimer');

    // Handle stun
    if (stunned) {
      ghost.setTexture('ghost_stunned');
      ghost.setData('stunTimer', stunTimer - delta);
      if (stunTimer - delta <= 0) {
        ghost.setData('stunned', false);
        ghost.setTexture('ghost');
        ghost.setAlpha(0.8);
      } else {
        // Pulsate when stunned
        ghost.setAlpha(0.4 + Math.sin(stunTimer * 0.01) * 0.3);
      }
      ghost.setVelocity(0, 0);
      return;
    }

    // AI timer
    let aiTimer = ghost.getData('aiTimer') - delta;
    if (aiTimer <= 0) {
      aiTimer = 1500 + Math.random() * 2000;
      // Decide behavior based on distance to player
      const dist = Phaser.Math.Distance.Between(ghost.x, ghost.y, this.player.x, this.player.y);
      if (dist < 200) {
        ghost.setData('aiState', 'chase');
      } else if (dist > 400) {
        ghost.setData('aiState', 'wander');
        ghost.setData('wanderDir', Math.random() > 0.5 ? 1 : -1);
      } else {
        ghost.setData('aiState', Math.random() > 0.5 ? 'chase' : 'wander');
      }
    }
    ghost.setData('aiTimer', aiTimer);

    const state = ghost.getData('aiState');
    const speed = GHOST_SPEED;

    if (state === 'chase') {
      // Move toward player
      const angle = Phaser.Math.Angle.Between(ghost.x, ghost.y, this.player.x, this.player.y);
      ghost.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed * 0.7);
      ghost.setFlipX(this.player.x < ghost.x);
    } else if (state === 'wander') {
      const dir = ghost.getData('wanderDir');
      ghost.setVelocityX(dir * speed * 0.5);
      ghost.setVelocityY(Math.sin(this.time.now * 0.002) * 30);
      ghost.setFlipX(dir < 0);
    } else if (state === 'flee') {
      const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, ghost.x, ghost.y);
      ghost.setVelocity(Math.cos(angle) * speed * 1.2, Math.sin(angle) * speed * 0.5);
      ghost.setFlipX(this.player.x > ghost.x);
    }

    // Floating bob
    ghost.y += Math.sin(this.time.now * 0.003 + ghost.x) * 0.3;

    // Ghost transparency pulsing
    if (!stunned) {
      ghost.setAlpha(0.6 + Math.sin(this.time.now * 0.002 + ghost.x * 0.1) * 0.2);
    }
  }

  // ---- Weapon Mechanics ----
  useVacuum(delta) {
    const px = this.player.x;
    const py = this.player.y;

    // Show beam - origin(0, 0.5) means it extends from left edge to right
    // Facing right: place at player right side, scaleX positive
    // Facing left: place at player left side, scaleX negative (mirrors it)
    this.vacuumBeam.setVisible(true);
    if (this.facingRight) {
      this.vacuumBeam.setPosition(px + 8, py);
      this.vacuumBeam.setScale(1, 1);
    } else {
      this.vacuumBeam.setPosition(px - 8, py);
      this.vacuumBeam.setScale(-1, 1);
    }

    // Increase light while using
    this.lightRadius = 160;

    // Pull and damage stunned ghosts
    this.ghosts.getChildren().forEach(ghost => {
      if (!ghost.active) return;
      const dist = Phaser.Math.Distance.Between(px, py, ghost.x, ghost.y);
      if (dist > VACUUM_RANGE) return;

      // Check if ghost is in front of player
      const inFront = this.facingRight ? (ghost.x > px) : (ghost.x < px);
      if (!inFront) return;

      const stunned = ghost.getData('stunned');
      if (stunned) {
        // Pull ghost toward player
        const angle = Phaser.Math.Angle.Between(ghost.x, ghost.y, px, py);
        ghost.x += Math.cos(angle) * 2;
        ghost.y += Math.sin(angle) * 2;

        // Damage ghost
        let hp = ghost.getData('hp') - (delta * 0.08);
        ghost.setData('hp', hp);

        // Visual feedback
        ghost.setTint(0xff88ff);

        if (hp <= 0) {
          this.captureGhost(ghost);
        }
      } else {
        // Slow down non-stunned ghosts slightly
        ghost.setVelocity(ghost.body.velocity.x * 0.95, ghost.body.velocity.y * 0.95);
      }
    });
  }

  useFlashlight() {
    const px = this.player.x;
    const py = this.player.y;

    // Show beam - mirror with negative scaleX when facing left
    this.flashlightBeam.setVisible(true);
    if (this.facingRight) {
      this.flashlightBeam.setPosition(px + 8, py);
      this.flashlightBeam.setScale(1, 1);
    } else {
      this.flashlightBeam.setPosition(px - 8, py);
      this.flashlightBeam.setScale(-1, 1);
    }

    this.lightRadius = 180;

    // Slowly stun ghosts in beam
    this.ghosts.getChildren().forEach(ghost => {
      if (!ghost.active) return;
      const dist = Phaser.Math.Distance.Between(px, py, ghost.x, ghost.y);
      if (dist > FLASHLIGHT_RANGE) return;

      const inFront = this.facingRight ? (ghost.x > px) : (ghost.x < px);
      if (!inFront) return;

      // Slow ghost and make them more visible
      ghost.setVelocity(ghost.body.velocity.x * 0.9, ghost.body.velocity.y * 0.9);
      ghost.setAlpha(Math.min(ghost.alpha + 0.01, 1));

      // Flashlight makes ghosts flee
      if (!ghost.getData('stunned')) {
        ghost.setData('aiState', 'flee');
      }
    });
  }

  useFlash() {
    if (this.flashCooldownTimer > 0) return;

    this.flashCooldownTimer = FLASH_COOLDOWN;
    const px = this.player.x;
    const py = this.player.y;

    // Visual effect
    this.flashEffect.setPosition(px, py).setVisible(true).setAlpha(1).setScale(0.5);
    this.tweens.add({
      targets: this.flashEffect,
      alpha: 0, scaleX: 4, scaleY: 4,
      duration: 400, ease: 'Power2',
      onComplete: () => this.flashEffect.setVisible(false)
    });

    // Screen flash
    this.cameras.main.flash(200, 255, 255, 255);

    // Stun all nearby ghosts
    this.ghosts.getChildren().forEach(ghost => {
      if (!ghost.active) return;
      const dist = Phaser.Math.Distance.Between(px, py, ghost.x, ghost.y);
      if (dist <= FLASH_RANGE) {
        ghost.setData('stunned', true);
        ghost.setData('stunTimer', 3000);
        ghost.setData('aiState', 'flee');
        // Knockback
        const angle = Phaser.Math.Angle.Between(px, py, ghost.x, ghost.y);
        ghost.setVelocity(Math.cos(angle) * 200, Math.sin(angle) * 200);
      }
    });
  }

  captureGhost(ghost) {
    this.ghostsCaptured++;
    this.score += 1000;

    // Capture animation
    this.tweens.add({
      targets: ghost,
      scaleX: 0, scaleY: 0, alpha: 0,
      duration: 500, ease: 'Power3',
      onComplete: () => {
        ghost.destroy();
      }
    });

    // Score popup
    const popup = this.add.text(ghost.x, ghost.y - 20, '+1000', {
      fontSize: '24px', fontFamily: 'monospace', color: '#ffdd44',
      stroke: '#000', strokeThickness: 3
    }).setDepth(20);
    this.tweens.add({
      targets: popup,
      y: ghost.y - 80, alpha: 0,
      duration: 1000, ease: 'Power2',
      onComplete: () => popup.destroy()
    });

    // Particle burst
    for (let i = 0; i < 12; i++) {
      const p = this.add.image(ghost.x, ghost.y, 'particle')
        .setTint(0xaa44ff).setScale(0.5).setDepth(20);
      const angle = (i / 12) * Math.PI * 2;
      this.tweens.add({
        targets: p,
        x: ghost.x + Math.cos(angle) * 60,
        y: ghost.y + Math.sin(angle) * 60,
        alpha: 0, scale: 0,
        duration: 600, ease: 'Power2',
        onComplete: () => p.destroy()
      });
    }

    // Update UI
    this.ghostText.setText('幽灵: ' + this.ghostsCaptured + '/' + this.totalGhosts);
    this.scoreText.setText('得分: ' + this.score);

    // Check win
    if (this.ghostsCaptured >= this.totalGhosts) {
      this.time.delayedCall(1000, () => this.winLevel());
    }
  }

  onGhostTouch(player, ghost) {
    if (!ghost.active || ghost.getData('stunned')) return;
    if (this.damageCooldown > 0) return;

    this.damageCooldown = 1000;
    this.playerHP = Math.max(0, this.playerHP - 15);
    this.updateHPBar();

    // Knockback
    const dir = player.x < ghost.x ? -1 : 1;
    player.setVelocity(dir * 250, -200);

    // Visual feedback
    this.cameras.main.shake(200, 0.01);
    player.setTint(0xff4444);
    this.time.delayedCall(300, () => player.clearTint());

    // Damage text
    const dmgText = this.add.text(player.x, player.y - 30, '-15', {
      fontSize: '20px', fontFamily: 'monospace', color: '#ff4444',
      stroke: '#000', strokeThickness: 3
    }).setDepth(20);
    this.tweens.add({
      targets: dmgText, y: player.y - 70, alpha: 0,
      duration: 800, onComplete: () => dmgText.destroy()
    });

    if (this.playerHP <= 0) {
      this.gameOver();
    }
  }

  // ---- Darkness / Lighting ----
  updateDarkness() {
    // Simply move the darkness mask to center on the player
    // The mask is 2048x2048 with a transparent hole at center (origin 0.5, 0.5 by default)
    const scale = this.lightRadius / 200; // 200 is the base lightR in the texture
    this.darknessMask.setPosition(this.player.x, this.player.y).setScale(scale);
  }

  // ---- Win / Lose ----
  winLevel() {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.physics.pause();

    const bg = this.add.graphics().setScrollFactor(0).setDepth(200);
    bg.fillStyle(0x000000, 0.7);
    bg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

    this.add.text(cx, cy - 60, '关卡完成!', {
      fontSize: '48px', fontFamily: 'serif', color: '#ffdd44',
      stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.add.text(cx, cy, '得分: ' + this.score, {
      fontSize: '32px', fontFamily: 'monospace', color: '#ffffff',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const restartBtn = this.add.text(cx, cy + 80, '[ 重新开始 ]', {
      fontSize: '28px', fontFamily: 'monospace', color: '#88ff88',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

    restartBtn.on('pointerdown', () => this.scene.restart());
  }

  gameOver() {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.physics.pause();

    const bg = this.add.graphics().setScrollFactor(0).setDepth(200);
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

    this.add.text(cx, cy - 40, 'GAME OVER', {
      fontSize: '52px', fontFamily: 'serif', color: '#ff4444',
      stroke: '#000', strokeThickness: 6
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    const restartBtn = this.add.text(cx, cy + 40, '[ 重新开始 ]', {
      fontSize: '28px', fontFamily: 'monospace', color: '#ffdd88',
      stroke: '#000', strokeThickness: 4
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive({ useHandCursor: true });

    restartBtn.on('pointerdown', () => this.scene.restart());
  }

  // ---- Main Update Loop ----
  update(time, delta) {
    if (!this.player.active) return;
    if (this.physics.world.isPaused) return;

    // ---- Cooldowns ----
    this.damageCooldown = Math.max(0, this.damageCooldown - delta);
    this.flashCooldownTimer = Math.max(0, this.flashCooldownTimer - delta);

    // Update flash CD display
    if (this.flashCooldownTimer > 0) {
      this.flashCDText.setText('闪光灯: ' + (this.flashCooldownTimer / 1000).toFixed(1) + 's');
      this.flashCDText.setColor('#888888');
    } else {
      this.flashCDText.setText('闪光灯: 就绪');
      this.flashCDText.setColor('#ffdd44');
    }

    // ---- Movement ----
    const left = this.cursors.left.isDown || this.wasd.left.isDown || this.touchState.left;
    const right = this.cursors.right.isDown || this.wasd.right.isDown || this.touchState.right;
    const jump = Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
                 Phaser.Input.Keyboard.JustDown(this.wasd.up) ||
                 Phaser.Input.Keyboard.JustDown(this.keySpace) ||
                 this.touchState.jump;

    if (left) {
      this.player.setVelocityX(-PLAYER_SPEED);
      this.facingRight = false;
      this.player.setFlipX(true);
    } else if (right) {
      this.player.setVelocityX(PLAYER_SPEED);
      this.facingRight = true;
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    if (jump && this.player.body.blocked.down) {
      this.player.setVelocityY(JUMP_VELOCITY);
    }

    // Reset jump touch state (so it doesn't keep jumping)
    if (this.touchState.jump) {
      this.touchState.jump = false;
    }

    // ---- Weapon Switch ----
    if (Phaser.Input.Keyboard.JustDown(this.keyC)) {
      this.currentWeapon = this.currentWeapon === 'vacuum' ? 'flashlight' : 'vacuum';
      this.updateWeaponUI();
    }

    // ---- Weapon Use ----
    const actionPressed = this.keyZ.isDown || this.touchState.action;
    const flashPressed = Phaser.Input.Keyboard.JustDown(this.keyX) || this.touchState.flash;

    this.vacuumBeam.setVisible(false);
    this.flashlightBeam.setVisible(false);
    this.lightRadius = 120;

    if (actionPressed) {
      if (this.currentWeapon === 'vacuum') {
        this.useVacuum(delta);
      } else {
        this.useFlashlight();
      }
    }

    if (flashPressed) {
      this.useFlash();
      this.touchState.flash = false;
    }

    // ---- Ghost AI ----
    this.ghosts.getChildren().forEach(ghost => {
      this.updateGhostAI(ghost, delta);

      // Ghost HP bar
      if (ghost.active && ghost.getData('stunned')) {
        const hp = ghost.getData('hp');
        const maxHp = ghost.getData('maxHp');
        // Draw HP bar above ghost (will be redrawn each frame)
      }
    });

    // ---- Darkness ----
    this.updateDarkness();

    // ---- Ghost HP bars (draw on top) ----
    if (!this.ghostHPGraphics) {
      this.ghostHPGraphics = this.add.graphics().setDepth(19);
    }
    this.ghostHPGraphics.clear();
    this.ghosts.getChildren().forEach(ghost => {
      if (!ghost.active) return;
      const hp = ghost.getData('hp');
      const maxHp = ghost.getData('maxHp');
      if (hp < maxHp) {
        const bx = ghost.x - 20;
        const by = ghost.y - 38;
        this.ghostHPGraphics.fillStyle(0x000000, 0.6);
        this.ghostHPGraphics.fillRect(bx, by, 40, 6);
        this.ghostHPGraphics.fillStyle(0xcc44ff, 0.9);
        this.ghostHPGraphics.fillRect(bx + 1, by + 1, 38 * (hp / maxHp), 4);
      }
    });
  }
}

// ============================================================
// Phaser Game Configuration
// ============================================================
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_W,
  height: GAME_H,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  input: {
    activePointers: 4,
  },
  scene: [BootScene, MenuScene, GameScene],
  backgroundColor: '#000000',
  render: {
    pixelArt: false,
    antialias: true,
  }
};

const game = new Phaser.Game(config);
