-- Stars Menu Bar Animation
-- Bara de meniu intunecata cu stele miscatoare ca fundal

local MENU_H    = 24
local NUM_STARS = 120
local FPS       = 30

local BG = { red = 0.02, green = 0.01, blue = 0.06, alpha = 0.96 }

local PALETA = {
  { r = 1.0, g = 1.0, b = 1.0 },   -- alb pur
  { r = 0.7, g = 0.85, b = 1.0 },  -- albastru-alb
  { r = 1.0, g = 0.9, b = 0.6 },   -- galben-cald
  { r = 0.6, g = 0.75, b = 1.0 },  -- albastru
  { r = 1.0, g = 0.7, b = 0.8 },   -- roz
}

local canvas, timer, stele = nil, nil, {}

local function latimeEcran()
  return hs.screen.mainScreen():fullFrame().w
end

local function steaNouă(w, dinDreapta)
  local c = PALETA[math.random(#PALETA)]
  return {
    x     = dinDreapta and (w + math.random(10, w)) or math.random(0, w),
    y     = math.random(3, MENU_H - 4),
    raza  = math.random(4, 14) * 0.12,
    viteza = math.random(20, 90) * 0.05,
    alfa  = math.random(55, 100) / 100,
    faza  = math.random(0, 628) / 100,
    vFaza = math.random(3, 18) * 0.01,
    c     = c,
  }
end

local function initStele()
  stele = {}
  local w = latimeEcran()
  for i = 1, NUM_STARS do
    table.insert(stele, steaNouă(w, false))
  end
end

local function construiesteFrame()
  local w = latimeEcran()
  local els = {}

  -- Fundal intunecat
  els[#els + 1] = {
    type      = "rectangle",
    action    = "fill",
    fillColor = BG,
    frame     = { x = 0, y = 0, w = w, h = MENU_H },
  }

  -- Gradient subtil in partea de sus
  els[#els + 1] = {
    type      = "rectangle",
    action    = "fill",
    fillColor = { red = 0.05, green = 0.02, blue = 0.15, alpha = 0.4 },
    frame     = { x = 0, y = 0, w = w, h = 6 },
  }

  for i, s in ipairs(stele) do
    -- Misca steaua spre stanga
    s.x = s.x - s.viteza
    if s.x < -3 then
      stele[i] = steaNouă(w, true)
      s = stele[i]
    end

    -- Efect de clipire
    s.faza = s.faza + s.vFaza
    local clipire = (math.sin(s.faza) + 1) * 0.5
    local alfaCurent = s.alfa * (0.3 + 0.7 * clipire)

    -- Steaua propriu-zisa
    els[#els + 1] = {
      type      = "circle",
      action    = "fill",
      fillColor = { red = s.c.r, green = s.c.g, blue = s.c.b, alpha = alfaCurent },
      center    = { x = s.x, y = s.y },
      radius    = s.raza,
    }

    -- Glow subtil pentru stelele mai mari
    if s.raza > 1.0 then
      els[#els + 1] = {
        type      = "circle",
        action    = "fill",
        fillColor = { red = s.c.r, green = s.c.g, blue = s.c.b, alpha = alfaCurent * 0.2 },
        center    = { x = s.x, y = s.y },
        radius    = s.raza * 2.5,
      }
    end
  end

  return els
end

local function porneste()
  if canvas then canvas:delete() end
  if timer  then timer:stop() end

  local w = latimeEcran()

  canvas = hs.canvas.new({ x = 0, y = 0, w = w, h = MENU_H })
  canvas:level(hs.canvas.windowLevels.mainMenu - 1)
  canvas:behavior({ "canJoinAllSpaces", "stationary" })
  canvas:show()

  initStele()

  timer = hs.timer.doEvery(1 / FPS, function()
    if canvas then
      canvas:replaceElements(construiesteFrame())
    end
  end)
end

local function opreste()
  if timer  then timer:stop();  timer  = nil end
  if canvas then canvas:delete(); canvas = nil end
end

-- Restart la schimbarea ecranului
hs.screen.watcher.new(porneste):start()

-- Hotkey: Cmd+Alt+Ctrl+R = reload config
hs.hotkey.bind({ "cmd", "alt", "ctrl" }, "R", hs.reload)

-- Hotkey: Cmd+Alt+Ctrl+S = toggle stele
hs.hotkey.bind({ "cmd", "alt", "ctrl" }, "S", function()
  if canvas then
    opreste()
    hs.alert.show("Stele oprite")
  else
    porneste()
    hs.alert.show("Stele pornite ✦")
  end
end)

porneste()
