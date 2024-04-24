function createMouseEvent(type, x, y) {
    return new MouseEvent(type, {
        view: window,
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0
    });
}
async function botplay() {
    startButton = document.querySelectorAll('.start-game-container .button')
    if (startButton.length >= 1) {
        const rect = startButton[0].getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;
        startButton[0].dispatchEvent(createMouseEvent('mousedown', x, y));
        startButton[0].dispatchEvent(createMouseEvent('mouseup', x, y));
        await new Promise(r => setTimeout(r, 1)); // sleep for 1ms
    }
    cells = document.querySelectorAll('.game-board .overlay .cell')
    ncell = cells.length
    n = Math.round(Math.sqrt(ncell))
    console.log('n',n)
    console.assert(n**2 == ncell)

    // function makeRect(idx1, idx2) {
    async function makeRect(i1, j1, i2, j2) {
        console.log("making rectangle", i1, j1, i2, j2)
        let idx1 = i1 * n + j1
        let idx2 = i2 * n + j2
        const rectStart = cells[0].getBoundingClientRect();
        const x1 = rectStart.left + rectStart.width / 2;
        const y1 = rectStart.top + rectStart.height / 2;
        const rectEnd = cells[1].getBoundingClientRect(); 
        const x2 = rectEnd.left + rectEnd.width / 2;
        const y2 = rectEnd.top + rectEnd.height / 2
        cells[idx1].dispatchEvent(createMouseEvent('mousedown', x1, y1));
        document.dispatchEvent(createMouseEvent('mousemove', x2, y2));
        cells[idx2].dispatchEvent(createMouseEvent('mouseup', x2, y2));
        await new Promise(r => setTimeout(r, 1)); // sleep for 1ms
    }

    t0 = new Date().getTime()

    // get content
    a = []
    for (let i=0; i<n; ++i) {
        a.push([])
        for (let j=0; j<n; ++j) {
            a[i].push(parseInt(cells[i*n+j].textContent | '0'))
        }
    }

    // 2D prefix sum number of numbers
    nrs = Array.from(Array(n+1), _ => Array(n+1).fill(0))
    for (let i=1; i<n+1; ++i) {
        for (let j=1; j<n+1; ++j) {
            nrs[i][j] += nrs[i-1][j]
            nrs[i][j] += nrs[i][j-1]
            nrs[i][j] -= nrs[i-1][j-1]
            nrs[i][j] += (a[i-1][j-1] != 0)
        }
    }

    occu = Array.from(Array(n), _ => Array(n).fill(0))
    function fillRect(i1,j1,i2,j2,val) {
        for (let i=i1; i<=i2; ++i)
            for (let j=j1; j<=j2; ++j)
                occu[i][j] = val
    }
    function rectClear(i1,j1,i2,j2) {
        for (let i=i1; i<=i2; ++i)
            for (let j=j1; j<=j2; ++j)
                if (occu[i][j] == 1)
                    return false
        return true
    }

    // precompute possible rectangles from upperleft corner
    // LUs = Array.from(Array(n), _ => Array(n).fill([]))
    LUs = Array.from(Array(n), _ => Array.from(Array(n), _ => []))
    for (let i=0; i<n; ++i) {
        for (let j=0; j<n; ++j) {
            if (a[i][j] != 0) {
                // Here's a number. Find possible rects around it
                possibleRectsForThis = []
                for (let h=1; h<=n; ++h) {
                    if (a[i][j] % h == 0) {
                        let w = a[i][j] / h
                        // a possible dimension is found. Find all possible locations
                        for (let y=Math.max(0, i-h+1); y<Math.min(n-h+1, i+1); ++y) {
                            for (let x=Math.max(0, j-w+1); x<Math.min(n-w+1, j+1); ++x) {
                                // rect: (y,x) -> (y+h-1, x+w-1)
                                // must contain only one number
                                nr = nrs[y+h][x+w] - nrs[y+h][x] - nrs[y][x+w] + nrs[y][x]
                                if (nr == 1) {
                                    if (x==0 && y==0)
                                        console.log('!', i,j,h,w)
                                    LUs[y][x].push([h,w])
                                    possibleRectsForThis.push([y,x,y+h-1,x+w-1])
                                }
                            }
                        }
                    }
                }
                // console.log('number', a[i][j], 'at', i, ',', j, 'found', stats, 'possible rects')
            }
        }
    }
    console.log(LUs)

    rects = []
    // dfs from topleft to bottomright
    dfs_counter = 0
    async function place(y, x) {
        dfs_counter += 1
        if (y==n) {
            // success
            console.log("Solution found", dfs_counter)
            t1 = new Date().getTime()
            console.log("in", t1-t0, "ms")

            for (const r of rects) {
                await makeRect(r[0], r[1], r[2], r[3])
            }
            throw "exiting"
        }
        if (occu[y][x] == 1) {
            await place(y+(x==n-1), (x+1)%n)
        }
        else {
            // try to place a rectangle starting at this position
            for (let i=0; i<LUs[y][x].length; ++i) {
                let h = LUs[y][x][i][0]
                let w = LUs[y][x][i][1]
                if (rectClear(y,x,y+h-1,x+w-1)) {
                    fillRect(y,x,y+h-1,x+w-1,1)
                    rects.push([y,x,y+h-1,x+w-1])
                    await place(y+(x==n-1), (x+1)%n)
                    fillRect(y,x,y+h-1,x+w-1,0)
                    rects.pop()
                }
            }
        }
    }
    await place(0,0)
    console.log("failed? counter", dfs_counter)
}
await botplay()
