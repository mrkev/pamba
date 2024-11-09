import React from "react";
import { WAMPLUGINS } from "../wam/plugins";
import { A } from "../utils/components";

export function AboutPanel() {
  return (
    <div style={{ userSelect: "all", overflow: "scroll" }}>
      <pre>
        miniDAW v{__APP_VERSION__}
        <br />
        ---
        <br />
        Kevin Chavez
        <br />
        <A href="http://aykev.dev" />
        <br />
        <a href="https://twitter.com/aykev" style={{ color: "white" }}>
          @aykev
        </a>
        <br />
        ---
        <br />
        OBXD: Jari Kleimola
        <br />
        - https://github.com/jariseon/webOBXD
        <br />
        StonePhaserStereo, BigMuff: Michel Buffa
        <br />
        - http://users.polytech.unice.fr/~buffa/
        <br />
        Dattorro Reverb: Jakob Zerbian
        <br />
        - https://github.com/grame-cncm/faustlibraries/blob/master/reverbs.lib
        <br />
        {WAMPLUGINS.map((x) => (
          <React.Fragment key={x.identifier}>
            {x.name}
            <br /> - {x.website != "" ? x.website : x.url}
            <br />
          </React.Fragment>
        ))}
        {/* todo: where did I get the sample music and how do I credit? */}
      </pre>
    </div>
  );
}
