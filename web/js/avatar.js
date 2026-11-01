/* Original, layered character artwork. No remote assets; appearance remains editable. */
(function (global) {
  'use strict';
  function index(value, count) { return Math.abs(parseInt(value, 10) || 0) % count; }

  global.renderCharacterAvatar = function (container, appearance, size, options) {
    if (!container) return;
    appearance = appearance || {};
    options = options || {};
    size = size || 80;
    const fullBody = options.fullBody || size >= 110;
    const skinIndex = index(appearance.skinToneIndex, 3);
    const skin = ['#F4CEAD', '#DDA779', '#A56D4F'][skinIndex];
    const shade = ['#DFA98B', '#BE855C', '#85523D'][skinIndex];
    const blush = ['#D98E79', '#C47D62', '#915242'][skinIndex];
    const hairIndex = index(appearance.hairIndex, 6);
    const hair = ['#382C2A', '#292629', '#714936', '#49312D', '#382D2D', '#614332'][hairIndex];
    const hairLight = ['#66504A', '#51464B', '#9E7455', '#755247', '#695047', '#8C6545'][hairIndex];
    const topIndex = index(appearance.topIndex, 5);
    const top = ['#527EB1', '#F5F0E2', '#60527A', '#CE5845', '#4D8171'][topIndex];
    const topShade = ['#355E8D', '#D5D0C4', '#473B60', '#A64035', '#346151'][topIndex];
    const pantsIndex = index(appearance.bottomIndex, 5);
    const pants = ['#3D536C', '#34383F', '#7E8A90', '#68546E', '#4C6161'][pantsIndex];
    const shoeIndex = index(appearance.shoesIndex, 5);
    const shoe = ['#EEE9DD', '#805C44', '#36383B', '#645047', '#A97948'][shoeIndex];
    const accessory = index(appearance.accessoryIndex, 4);
    const emotion = options.emotion || 'neutral';
    const outline = '#3B3031';
    const faceIndex = index(appearance.faceIndex, 5);
    const chins = [
      'M103 86C99 105 101 130 113 143C124 156 143 159 158 148C175 137 179 114 175 90Z',
      'M105 83C99 106 103 135 116 149C128 162 146 160 159 146C174 130 178 107 172 86Z',
      'M103 87C99 106 102 132 111 145C119 152 145 158 159 148C174 135 178 111 174 88Z',
      'M102 87C98 105 104 127 115 141L137 157C147 158 165 139 171 123C179 106 175 91 172 87Z',
      'M104 84C98 104 103 124 111 138C122 145 125 155 138 157C151 155 161 143 168 130C177 113 176 95 172 86Z'
    ];
    const backHair = [
      '', '',
      'M93 78C89 110 87 133 96 153L116 157L112 94L162 91L161 155L181 148C189 115 189 82 173 62Z',
      'M97 76C84 113 89 162 73 177C97 186 120 174 122 155L167 154C177 170 192 174 204 168C181 144 190 102 174 69Z',
      'M172 79C194 62 217 74 211 96C207 110 220 121 214 137C195 126 192 105 180 99Z',
      'M95 85C80 89 82 109 93 115L181 114C192 97 185 83 174 79Z'
    ][hairIndex];
    const frontHair = [
      'M99 110C88 93 90 70 104 59C113 45 134 49 145 44C153 40 157 37 160 40L158 51C181 50 191 72 181 103L172 115L169 84C148 93 134 79 125 75C120 94 108 88 106 107L105 116Z',
      'M100 111C91 92 95 69 108 61C124 48 157 51 171 67C181 77 184 96 175 113L168 90C151 84 124 84 108 93L106 113Z',
      'M96 117C87 102 92 76 102 65C117 48 147 48 167 61C184 74 185 99 177 120L168 114L166 87C151 91 129 83 119 77C114 97 104 99 104 117Z',
      'M97 115C87 93 93 67 109 57C130 43 158 49 173 64C185 78 185 100 177 117L168 110L165 78C147 85 132 78 123 69C118 91 110 95 105 111Z',
      'M99 111C88 86 102 60 121 56C148 46 174 60 180 81C184 94 181 107 175 117L166 104L162 78C142 86 123 79 115 80L106 113Z',
      'M98 113C86 112 82 100 88 92C76 85 81 70 93 67C88 53 105 45 114 50C121 36 136 42 141 47C150 34 169 43 170 54C187 50 196 66 188 77C200 86 190 102 178 105L171 117L167 85C153 90 145 78 135 82C124 91 118 80 110 90L107 115Z'
    ][hairIndex];
    const shortBottom = pantsIndex === 2;
    const skirt = pantsIndex === 3;
    const legs = skirt
      ? `<path d="M115 260L117 320L133 323L143 267L155 319L171 316L165 258Z" fill="${skin}"/><path d="M117 300L118 325L132 326L135 303M154 301L156 322L171 320L168 299" fill="#E7E4DC"/>`
      : shortBottom
        ? `<path d="M103 250L113 316L131 321L135 254M147 255L155 319L174 315L171 248" fill="${skin}"/><path d="M111 298L114 322L132 325L134 301M153 299L156 324L174 320L172 296" fill="#E7E4DC"/>`
        : `<path d="M101 236C98 257 102 289 109 322L134 324L139 270L150 322L176 318C175 284 180 260 169 236Z" fill="${pants}"/><path d="M139 251L139 270M111 267L118 313M165 264L164 309" fill="none" stroke="#23313A" stroke-opacity=".4" stroke-width="2"/><path d="M108 314L134 316L134 326L109 325M149 314L176 310L177 321L151 325" fill="#FFFFFF" fill-opacity=".14"/>`;
    const lower = skirt
      ? `<path d="M106 231L94 275C118 283 153 284 180 270L164 230Z" fill="${pants}"/><path d="M117 240L112 274M136 241L135 277M156 239L161 274" stroke="#3A3345" stroke-opacity=".5" stroke-width="2"/>`
      : shortBottom
        ? `<path d="M102 231L101 273L133 278L140 254L148 276L177 270L168 230Z" fill="${pants}"/><path d="M111 264L132 268M152 266L169 263" stroke="#D7D9D2" stroke-width="2"/>` : '';
    const footwear = `<g stroke="${outline}" stroke-width="1.4" stroke-linejoin="round"><path d="M109 320C107 325 99 328 97 335L98 342L136 341L136 324L125 320Z" fill="${shoe}"/><path d="M151 320L151 339L185 339L187 333C181 326 174 325 171 318Z" fill="${shoe}"/><path d="M98 336L136 335L136 342L97 343ZM151 334L186 333L187 339L150 340Z" fill="#EAE6DC"/></g><path d="M111 326L124 327M108 330L122 332M159 325L173 325M162 329L177 329" stroke="${shoeIndex === 0 ? '#97988F' : '#E9E3D9'}" stroke-width="2" stroke-linecap="round"/>`;
    const sleeves = `<path d="M112 165C98 161 91 173 87 186L76 217C75 226 84 232 92 226L110 200Z" fill="${top}"/><path d="M161 166C175 161 186 177 190 190L200 215L187 226L168 202Z" fill="${top}"/><path d="M79 211L94 217M185 211L197 205" stroke="${topShade}" stroke-width="3"/>`;
    const hands = `<g fill="${skin}" stroke="${shade}" stroke-width="1.3"><path d="M78 218C74 224 70 239 75 244C79 247 81 242 81 239C83 249 87 246 87 241C91 247 94 243 92 236L90 227L94 220Z"/><path d="M188 218C186 225 182 232 174 235C171 239 175 242 181 240C183 247 189 243 193 239L200 227L197 217Z"/></g>`;
    const body = `<path d="M113 161C124 156 150 156 163 164L172 188L169 241C150 250 117 246 102 238L107 192L101 176Z" fill="${top}"/><path d="M105 223C117 231 154 232 170 227L169 241C149 250 119 246 102 238Z" fill="${topShade}"/><path d="M112 187L109 214M164 190L166 217M120 231L135 233" fill="none" stroke="${topShade}" stroke-width="2" stroke-linecap="round"/>`;
    const clothes = topIndex === 3
      ? `<path d="M113 164C104 149 119 143 128 146L152 146C168 146 174 157 164 169L150 181L128 181Z" fill="${topShade}"/><path d="M124 164L130 178L149 177L157 163" fill="none" stroke="#F1B3A1" stroke-width="3"/><path d="M128 177L125 203M151 177L154 201" stroke="#EFE5D7" stroke-width="2" stroke-linecap="round"/><path d="M120 212L115 227C127 233 147 234 158 229L155 214Z" fill="${topShade}"/><path d="M121 215L153 217" stroke="#DB7C67" stroke-width="1.5"/>`
      : topIndex === 2
        ? `<path d="M124 159L140 170L151 158L159 235L119 237Z" fill="#EEE9DE"/><path d="M118 159L109 175L127 191L120 236L137 198L130 166M156 160L168 178L153 193L158 235L141 197L148 166" fill="${topShade}"/><circle cx="143" cy="208" r="2" fill="#DCCDA7"/>`
        : topIndex === 1 || topIndex === 4
          ? `<path d="M121 159L139 168L154 157L158 172L147 181L139 170L129 181L117 173Z" fill="${topShade}"/><path d="M139 173L140 229" stroke="${topShade}" stroke-width="1.5"/><g fill="${topIndex === 1 ? '#6B7472' : '#D8E1D5'}"><circle cx="140" cy="187" r="1.4"/><circle cx="140" cy="199" r="1.4"/><circle cx="140" cy="211" r="1.4"/></g>`
          : `<path d="M120 160C122 179 151 181 157 160" fill="none" stroke="${topShade}" stroke-width="5"/><path d="M151 195L160 195L160 205L151 205Z" fill="#EAD6AA"/><path d="M154 198L157 201L154 203" fill="none" stroke="${topShade}" stroke-width="1.5"/>`;
    const mouth = emotion === 'happy'
      ? `<path d="M123 131Q139 143 154 129C151 148 131 151 123 131Z" fill="#743E3C"/><path d="M126 133Q139 140 151 132L149 138Q138 143 129 137Z" fill="#FFF7EB"/>`
      : emotion === 'thinking'
        ? '<path d="M130 137Q140 132 148 135" fill="none" stroke="#854C45" stroke-width="2.2" stroke-linecap="round"/>'
        : '<path d="M125 132Q140 143 153 130" fill="none" stroke="#854C45" stroke-width="2.2" stroke-linecap="round"/><path d="M130 139Q139 143 146 138" fill="none" stroke="#FFFFFF" stroke-opacity=".3" stroke-width="1.5"/>';
    const eyebrows = emotion === 'thinking'
      ? '<path d="M111 96Q119 89 127 94M148 92L162 97"/>'
      : '<path d="M111 95Q119 91 127 95M148 94Q156 90 164 94"/>';
    const head = `<g transform="rotate(-4 139 108)"><path d="${backHair}" fill="${hair}"/><path d="M125 144L124 164Q139 179 153 162L151 142Z" fill="${skin}"/><path d="M126 145Q137 160 152 145L152 155Q137 167 125 153Z" fill="${shade}"/><ellipse cx="101" cy="113" rx="8" ry="12" fill="${skin}"/><ellipse cx="176" cy="112" rx="7" ry="12" fill="${skin}"/><path d="M99 110Q105 107 104 118M176 109Q171 108 173 117" fill="none" stroke="${shade}" stroke-width="2"/><path d="${chins[faceIndex]}" fill="${skin}"/><path d="M169 93C173 119 166 139 149 150C172 144 180 117 174 90Z" fill="${shade}" opacity=".5"/><g fill="${blush}" opacity=".4"><ellipse cx="116" cy="123" rx="8" ry="4"/><ellipse cx="161" cy="121" rx="7" ry="4"/></g><g fill="#FFF8EC"><path d="M110 105Q119 99 128 105Q121 114 112 109Z"/><path d="M146 104Q156 98 165 104Q159 113 148 108Z"/></g><g fill="#403B31"><ellipse cx="121" cy="106" rx="3.5" ry="4.5"/><ellipse cx="155" cy="105" rx="3.5" ry="4.5"/></g><g fill="white"><circle cx="122" cy="104" r="1.1"/><circle cx="156" cy="103" r="1.1"/></g><g fill="none" stroke="${outline}" stroke-width="1.4" stroke-linecap="round"><path d="M110 105Q119 99 128 105M146 104Q156 98 165 104"/></g><g fill="none" stroke="${hair}" stroke-width="2.6" stroke-linecap="round">${eyebrows}</g><path d="M139 109L135 121Q140 126 145 121" fill="none" stroke="${shade}" stroke-width="2" stroke-linecap="round"/>${mouth}<path d="${frontHair}" fill="${hair}"/><path d="M105 76Q123 58 143 64M114 69Q139 51 159 64M167 70L173 83" fill="none" stroke="${hairLight}" stroke-width="2.4" stroke-linecap="round" opacity=".65"/>${accessory === 1 ? '<g fill="none" stroke="#484B47" stroke-width="2.2"><path d="M106 102L100 101M169 101L179 98M132 105Q138 101 143 104"/><path d="M109 100Q120 96 131 100L130 114Q119 120 109 113ZM144 99Q156 95 167 98L167 111Q156 118 146 112Z"/></g>' : ''}${accessory === 2 ? '<path d="M96 106C83 46 184 40 182 105" fill="none" stroke="#414751" stroke-width="7"/><path d="M96 102L97 121M180 101L178 119" stroke="#E9B94C" stroke-width="10" stroke-linecap="round"/>' : ''}</g>`;
    const watch = accessory === 0 ? '<path d="M78 223L91 229" stroke="#3E4B4C" stroke-width="6"/><ellipse cx="85" cy="226" rx="4.5" ry="5" fill="#D9DCD2" stroke="#3E4B4C" stroke-width="1.5"/><path d="M85 223L85 226L87 227" fill="none" stroke="#3E4B4C" stroke-width="1"/>' : '';
    const viewBox = fullBody ? '55 30 165 320' : '88 45 99 112';
    container.innerHTML = `<svg class="character-art" xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${size}" height="${size}" role="img" aria-label="Твой персонаж" focusable="false"><ellipse cx="141" cy="342" rx="50" ry="5" fill="#383D31" opacity=".09"/>${legs}${lower}${footwear}${sleeves}${hands}${body}${clothes}${head}${watch}</svg>`;
    container.style.width = size + 'px';
    container.style.height = size + 'px';
    container.style.background = 'transparent';
    container.style.borderRadius = '0';
    container.style.overflow = 'visible';
    container.classList.add('illustrated-avatar');
  };
})(window);
