var router = require('express').Router();

router.get('/sub/sports', function (요청, 응답 ) {
    응답.send('스포츠 게시판')
})

router.get('/sub/game', function (요청, 응답 ) {
    응답.send('게임 게시판')
})

module.exports = router;