import("stdfaust.lib");
g = hslider("pan",0.5,0,1,0.01);

process = 
    sp.panner(g);

